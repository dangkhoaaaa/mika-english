package services

import (
	"fmt"
	"net/smtp"
	"strings"

	"mika-english-backend/internal/config"
)

// SendReminderEmail gửi email nhắc từ vựng (plain text UTF-8).
func SendReminderEmail(cfg config.Config, to, subject, body string) error {
	if !cfg.SMTPEnabled() {
		return fmt.Errorf("SMTP chưa cấu hình (SMTP_HOST, SMTP_FROM, SMTP_USER)")
	}
	port := cfg.SMTPPort
	if port == "" {
		port = "587"
	}
	addr := fmt.Sprintf("%s:%s", cfg.SMTPHost, port)
	auth := smtp.PlainAuth("", cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPHost)
	from := cfg.SMTPFrom
	if !strings.Contains(from, "<") {
		from = fmt.Sprintf("<%s>", from)
	}
	msg := strings.Builder{}
	msg.WriteString(fmt.Sprintf("From: %s\r\n", cfg.SMTPFrom))
	msg.WriteString(fmt.Sprintf("To: %s\r\n", to))
	msg.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(body)
	return smtp.SendMail(addr, auth, cfg.SMTPFrom, []string{to}, []byte(msg.String()))
}
