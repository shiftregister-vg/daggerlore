package main

import (
	"log"
	"net"
	"os"

	"github.com/gofiber/fiber/v3"
)

func main() {
	app := fiber.New()

	app.Get("/liveness", func(c fiber.Ctx) error {
		return c.SendString("alive!")
	})
	api := app.Group("/api")
	rest := api.Group("/rest")
	restV1 := rest.Group("/v1")
	restV1.Get("/", func(c fiber.Ctx) error {
		return c.SendString("Hello, World!")
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
