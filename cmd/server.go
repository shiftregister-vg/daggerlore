package main

import (
	"log"
	"net"
	"os"

	"github.com/gofiber/fiber/v3"
	"github.com/shiftregister-vg/daggerlore/pkg/auth"
)

func main() {
	app := fiber.New()
	authStore, authStoreErr := auth.NewStoreFromEnv()
	if authStoreErr != nil {
		log.Printf("auth middleware unavailable: %v", authStoreErr)
	} else {
		defer authStore.Close()
	}

	app.Get("/liveness", func(c fiber.Ctx) error {
		return c.SendString("alive!")
	})

	app.Route("/api", func(r fiber.Router) {
		// /api/rest
		r.Route("/rest", func(r fiber.Router) {

			// /api/rest/v1
			r.Route("/v1", func(r fiber.Router) {

				// /api/rest/v1/hello
				r.Get("/hello", func(c fiber.Ctx) error {
					return c.SendString("Hello, World!")
				})

				// /api/rest/v1/users/:id
				r.Get("/users/:id", func(c fiber.Ctx) error {
					return c.JSON(fiber.Map{
						"id":   c.Params("id", "00000000000"),
						"name": "Vanessa Good",
					})
				})

				if authStore != nil {
					r.Get("/me", auth.RequireAuth(authStore), func(c fiber.Ctx) error {
						user, ok := auth.CurrentUser(c)
						if !ok {
							return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "missing_current_user"})
						}
						return c.JSON(user)
					})
				} else {
					r.Get("/me", func(c fiber.Ctx) error {
						return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "auth_unavailable"})
					})
				}

			})

		})

	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	host := os.Getenv("HOST")
	if host == "" {
		host = "::"
	}

	log.Fatal(app.Listen(net.JoinHostPort(host, port)))
}
