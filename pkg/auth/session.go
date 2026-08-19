package auth

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/shiftregister-vg/daggerlore/pkg/model"
	_ "modernc.org/sqlite"
)

const (
	secureSessionCookieName = "__Secure-authjs.session-token"
	localSessionCookieName  = "authjs.session-token"
	currentUserLocalKey     = "auth.user"
	maxSessionCookieChunks  = 20
)

var ErrMissingDatabaseURL = errors.New("DATABASE_URL is not configured")

type Store struct {
	db      *sql.DB
	dialect string
}

func NewStoreFromEnv() (*Store, error) {
	return NewStore(os.Getenv("DATABASE_URL"))
}

func NewStore(databaseURL string) (*Store, error) {
	if databaseURL == "" {
		return nil, ErrMissingDatabaseURL
	}

	driverName := "pgx"
	dataSource := databaseURL
	dialect := "postgres"

	if strings.HasPrefix(databaseURL, "file:") {
		driverName = "sqlite"
		dataSource = strings.TrimPrefix(databaseURL, "file:")
		dialect = "sqlite"
	}

	db, err := sql.Open(driverName, dataSource)
	if err != nil {
		return nil, err
	}

	return &Store{db: db, dialect: dialect}, nil
}

func (s *Store) Close() error {
	if s == nil || s.db == nil {
		return nil
	}
	return s.db.Close()
}

func (s *Store) UserForSessionToken(ctx context.Context, sessionToken string) (*model.User, error) {
	if sessionToken == "" {
		return nil, sql.ErrNoRows
	}

	query := `
		select users.id, coalesce(users.name, ''), users.email, coalesce(users.image, ''), users.is_admin
		from sessions
		inner join users on users.id = sessions.user_id
		where sessions.session_token = ? and sessions.expires > ? and users.disabled_at is null and users.banned_at is null
		limit 1
	`
	expiresValue := any(time.Now().UTC().UnixMilli())
	if s.dialect == "postgres" {
		expiresValue = time.Now().UTC()
	}
	args := []any{sessionToken, expiresValue}
	if s.dialect == "postgres" {
		query = postgresQuery(query)
	}

	var user model.User
	err := s.db.QueryRowContext(ctx, query, args...).Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.Image,
		&user.IsAdmin,
	)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func RequireAuth(store *Store) fiber.Handler {
	return func(c fiber.Ctx) error {
		sessionToken := SessionTokenFromFiber(c)
		user, err := store.UserForSessionToken(c.Context(), sessionToken)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "session_lookup_failed"})
		}

		c.Locals(currentUserLocalKey, user)
		return c.Next()
	}
}

func SessionTokenFromFiber(c fiber.Ctx) string {
	return SessionTokenFromCookieGetter(c.Cookies)
}

func SessionTokenFromCookieGetter(cookieValue func(string, ...string) string) string {
	for _, name := range []string{secureSessionCookieName, localSessionCookieName} {
		if value := sessionCookieValueFromGetter(cookieValue, name); value != "" {
			return value
		}
	}
	return ""
}

func CurrentUser(c fiber.Ctx) (*model.User, bool) {
	user, ok := c.Locals(currentUserLocalKey).(*model.User)
	return user, ok
}

func SessionTokenFromRequest(cookieHeader []byte) string {
	if len(cookieHeader) == 0 {
		return ""
	}

	cookies := parseCookies(string(cookieHeader))
	for _, name := range []string{secureSessionCookieName, localSessionCookieName} {
		if value := sessionCookieValue(cookies, name); value != "" {
			return value
		}
	}
	return ""
}

func sessionCookieValueFromGetter(cookieValue func(string, ...string) string, name string) string {
	if value := cookieValue(name); value != "" {
		return value
	}

	var token strings.Builder
	for index := range maxSessionCookieChunks {
		value := cookieValue(name + "." + strconv.Itoa(index))
		if value == "" {
			break
		}
		token.WriteString(value)
	}
	return token.String()
}

func sessionCookieValue(cookies map[string]string, name string) string {
	if value := cookies[name]; value != "" {
		return value
	}

	chunks := make([]string, 0)
	prefix := name + "."
	for cookieName := range cookies {
		if strings.HasPrefix(cookieName, prefix) {
			chunks = append(chunks, cookieName)
		}
	}
	if len(chunks) == 0 {
		return ""
	}

	sort.Slice(chunks, func(i, j int) bool {
		return cookieChunkIndex(chunks[i]) < cookieChunkIndex(chunks[j])
	})

	var token strings.Builder
	for _, chunkName := range chunks {
		token.WriteString(cookies[chunkName])
	}
	return token.String()
}

func parseCookies(cookieHeader string) map[string]string {
	request := http.Request{Header: http.Header{"Cookie": []string{cookieHeader}}}
	cookies := make(map[string]string)
	for _, cookie := range request.Cookies() {
		value, err := url.QueryUnescape(cookie.Value)
		if err != nil {
			value = cookie.Value
		}
		cookies[cookie.Name] = value
	}
	return cookies
}

func cookieChunkIndex(name string) int {
	index, err := strconv.Atoi(name[strings.LastIndex(name, ".")+1:])
	if err != nil {
		return 0
	}
	return index
}

func postgresQuery(query string) string {
	index := 0
	var converted strings.Builder
	for _, r := range query {
		if r != '?' {
			converted.WriteRune(r)
			continue
		}
		index++
		converted.WriteString("$")
		converted.WriteString(strconv.Itoa(index))
	}
	return converted.String()
}
