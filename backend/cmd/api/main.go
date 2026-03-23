package main

import (
	"log"
	"net/http"

	"mika-english-backend/internal/config"
	"mika-english-backend/internal/handlers"
)

func main() {
	cfg := config.Load()

	router := handlers.NewRouter()
	log.Printf("Mika English API running on :%s", cfg.AppPort)
	if err := http.ListenAndServe(":"+cfg.AppPort, router); err != nil {
		log.Fatal(err)
	}
}
