package main

import (
	"fmt"
	"./agro-mas-backend/internal/auth"
)

func main() {
	pm := auth.NewPasswordManager(nil)
	hash, err := pm.HashPassword("Test123!")
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	fmt.Printf("Password hash: %s\n", hash)
}