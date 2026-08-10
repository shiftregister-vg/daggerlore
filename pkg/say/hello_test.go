package say_test

import (
	"testing"

	"github.com/shiftregister-vg/daggerlore/pkg/say"
)

func TestHello(t *testing.T) {
	phrase := "World!"
	expected := "Hello, World!"

	say.Hello(phrase)
	println("Above should read: \"" + expected + "\"")
}
