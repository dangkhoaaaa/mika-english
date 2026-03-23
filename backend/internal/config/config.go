package config

import (
	"os"
	"path/filepath"
	"sync"

	"github.com/joho/godotenv"
)

type Config struct {
	AppPort      string
	MongoURI     string
	MongoDBName  string
	JWTSecretKey string
	GoogleClient string
	// SMTP — để gửi nhắc từ vựng (để trống = không gửi mail, job vẫn cập nhật lịch).
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string
}

func Load() Config {
	loadDotEnvOnce()
	return Config{
		AppPort:      getEnv("APP_PORT", "8080"),
		MongoURI:     getEnv("MONGO_URI", "mongodb://localhost:27017"),
		MongoDBName:  getEnv("MONGO_DB_NAME", "mika_english"),
		JWTSecretKey: getEnv("JWT_SECRET", "dev-secret"),
		GoogleClient: getEnv("GOOGLE_CLIENT_ID", ""),
		SMTPHost:     getEnv("SMTP_HOST", ""),
		SMTPPort:     getEnv("SMTP_PORT", "587"),
		SMTPUser:     getEnv("SMTP_USER", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:     getEnv("SMTP_FROM", ""),
	}
}

func (c Config) SMTPEnabled() bool {
	return c.SMTPHost != "" && c.SMTPFrom != "" && c.SMTPUser != ""
}

var dotEnvOnce sync.Once

func loadDotEnvOnce() {
	dotEnvOnce.Do(func() {
		// Go không tự đọc file .env. Ta chủ động nạp từ các vị trí thường gặp.
		candidates := []string{
			".env",
			filepath.Join("..", ".env"),
			filepath.Join("..", "..", ".env"),
		}
		for _, p := range candidates {
			if _, err := os.Stat(p); err == nil {
				_ = godotenv.Load(p)
				return
			}
		}
		// fallback: cố tải mặc định theo working directory
		_ = godotenv.Load()
	})
}

func getEnv(key, fallback string) string {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	return val
}
