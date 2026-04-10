package main

import (
	"fmt"

	"golocalthreat/internal/app"
)

func main() {
	service := app.NewAppService()
	fmt.Printf("goLocalThreat bootstrap ready: %T\n", service)
}
