package main

import (
	"log"
	"net/http"
	"os"

	"mika-english-backend/internal/handlers"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = os.Getenv("APP_PORT")
	}
	if port == "" {
		port = "8080"
	}

	router := handlers.NewRouter()
	log.Printf("Mika English API running on :%s", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatal(err)
	}
}
