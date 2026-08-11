package main

import (
	"log"

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

	log.Fatal(app.Listen(":3000"))
}
