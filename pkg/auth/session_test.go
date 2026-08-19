package auth

import "testing"

func TestSessionTokenFromRequestReadsSecureCookie(t *testing.T) {
	token := SessionTokenFromRequest([]byte("__Secure-authjs.session-token=secure-token; other=value"))
	if token != "secure-token" {
		t.Fatalf("expected secure-token, got %q", token)
	}
}

func TestSessionTokenFromRequestReadsLocalCookie(t *testing.T) {
	token := SessionTokenFromRequest([]byte("authjs.session-token=local-token"))
	if token != "local-token" {
		t.Fatalf("expected local-token, got %q", token)
	}
}

func TestSessionTokenFromRequestJoinsChunkedCookies(t *testing.T) {
	token := SessionTokenFromRequest([]byte("__Secure-authjs.session-token.1=bar; __Secure-authjs.session-token.0=foo"))
	if token != "foobar" {
		t.Fatalf("expected foobar, got %q", token)
	}
}

func TestSessionTokenFromRequestPrefersSecureCookie(t *testing.T) {
	token := SessionTokenFromRequest([]byte("authjs.session-token=local; __Secure-authjs.session-token=secure"))
	if token != "secure" {
		t.Fatalf("expected secure, got %q", token)
	}
}

func TestSessionTokenFromCookieGetterJoinsChunkedCookies(t *testing.T) {
	cookies := map[string]string{
		"__Secure-authjs.session-token.0": "foo",
		"__Secure-authjs.session-token.1": "bar",
	}
	token := SessionTokenFromCookieGetter(func(name string, defaultValue ...string) string {
		if value := cookies[name]; value != "" {
			return value
		}
		if len(defaultValue) > 0 {
			return defaultValue[0]
		}
		return ""
	})
	if token != "foobar" {
		t.Fatalf("expected foobar, got %q", token)
	}
}
