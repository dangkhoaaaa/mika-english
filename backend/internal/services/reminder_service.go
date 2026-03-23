package services

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"mika-english-backend/internal/config"
	"mika-english-backend/internal/models"
	"mika-english-backend/internal/reminder"
	"mika-english-backend/internal/repositories"

)

type ReminderService struct {
	cfg       config.Config
	repo      *repositories.ReminderRepository
	vocabRepo *repositories.VocabularyRepository
}

func NewReminderService(cfg config.Config, r *repositories.ReminderRepository, v *repositories.VocabularyRepository) *ReminderService {
	return &ReminderService{cfg: cfg, repo: r, vocabRepo: v}
}

func (s *ReminderService) Get(ctx context.Context, userID string) (*models.WordReminder, error) {
	return s.repo.GetByUser(ctx, userID)
}

type ReminderUpsertInput struct {
	NotifyEmail   string   `json:"notifyEmail"`
	Schedule      string   `json:"schedule"`
	Hour          int      `json:"hour"`
	Minute        int      `json:"minute"`
	Weekday       int      `json:"weekday"`
	VocabularyIDs []string `json:"vocabularyIds"`
	Enabled       bool     `json:"enabled"`
}

func (s *ReminderService) Upsert(ctx context.Context, userID string, in ReminderUpsertInput) (*models.WordReminder, error) {
	sched := strings.ToLower(strings.TrimSpace(in.Schedule))
	if sched != "hourly" && sched != "daily" && sched != "weekly" {
		return nil, fmt.Errorf("schedule phải là hourly, daily hoặc weekly")
	}
	email := strings.TrimSpace(in.NotifyEmail)
	if email == "" {
		return nil, fmt.Errorf("notifyEmail là bắt buộc")
	}
	if in.Hour < 0 || in.Hour > 23 || in.Minute < 0 || in.Minute > 59 {
		return nil, fmt.Errorf("giờ/phút không hợp lệ")
	}
	wd := in.Weekday
	if wd < 0 || wd > 6 {
		wd = 0
	}

	now := time.Now().UTC()
	existing, _ := s.repo.GetByUser(ctx, userID)

	item := &models.WordReminder{
		UserID:        userID,
		NotifyEmail:   email,
		Schedule:      sched,
		Hour:          in.Hour,
		Minute:        in.Minute,
		Weekday:       wd,
		VocabularyIDs: in.VocabularyIDs,
		Enabled:       in.Enabled,
		NextRunAt:     reminder.NextRun(sched, in.Hour, in.Minute, wd, now),
	}
	if existing != nil {
		item.ID = existing.ID
		item.CreatedAt = existing.CreatedAt
	}

	if err := s.repo.Save(ctx, item); err != nil {
		return nil, err
	}
	return s.repo.GetByUser(ctx, userID)
}

func (s *ReminderService) DeleteByUser(ctx context.Context, userID string) error {
	return s.repo.DeleteByUser(ctx, userID)
}

// ProcessDue chạy định kỳ: gửi mail và cập nhật nextRunAt.
func (s *ReminderService) ProcessDue(ctx context.Context) {
	now := time.Now().UTC()
	due, err := s.repo.ListDue(ctx, now)
	if err != nil {
		log.Printf("reminder ListDue: %v", err)
		return
	}
	for _, ritem := range due {
		if len(ritem.VocabularyIDs) == 0 {
			next := reminder.NextRun(ritem.Schedule, ritem.Hour, ritem.Minute, ritem.Weekday, now)
			_ = s.repo.UpdateAfterSend(ctx, ritem.ID, next, now)
			continue
		}
		words, err := s.vocabRepo.ListByIDsForUser(ctx, ritem.UserID, ritem.VocabularyIDs)
		if err != nil {
			log.Printf("reminder vocab load %s: %v", ritem.UserID, err)
			continue
		}
		if len(words) == 0 {
			next := reminder.NextRun(ritem.Schedule, ritem.Hour, ritem.Minute, ritem.Weekday, now)
			_ = s.repo.UpdateAfterSend(ctx, ritem.ID, next, now)
			continue
		}
		var lines []string
		for _, w := range words {
			lines = append(lines, fmt.Sprintf("- %s — %s", w.Vocabulary, w.Meaning))
		}
		body := "Mika English — nhắc ôn từ vựng:\n\n" + strings.Join(lines, "\n") + "\n\nChúc bạn học tốt!"
		subj := "Mika English — Ôn từ vựng"
		if s.cfg.SMTPEnabled() {
			if err := SendReminderEmail(s.cfg, ritem.NotifyEmail, subj, body); err != nil {
				log.Printf("reminder mail to %s: %v", ritem.NotifyEmail, err)
			}
		} else {
			log.Printf("reminder: SMTP tắt, bỏ qua gửi mail tới %s (%d từ)", ritem.NotifyEmail, len(words))
		}
		next := reminder.NextRun(ritem.Schedule, ritem.Hour, ritem.Minute, ritem.Weekday, now)
		_ = s.repo.UpdateAfterSend(ctx, ritem.ID, next, now)
	}
}
