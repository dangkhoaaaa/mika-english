package services

import (
	"context"
	"fmt"
	"log"
	"sort"
	"strings"
	"time"

	"mika-english-backend/internal/config"
	"mika-english-backend/internal/models"
	"mika-english-backend/internal/repositories"
)

type InactivityService struct {
	cfg   config.Config
	repo  *repositories.InactivityReminderRepository
	stats *StatsService
}

func NewInactivityService(cfg config.Config, repo *repositories.InactivityReminderRepository, stats *StatsService) *InactivityService {
	return &InactivityService{cfg: cfg, repo: repo, stats: stats}
}

type InactivityUpsertInput struct {
	NotifyEmail    string `json:"notifyEmail"`
	Enabled        bool   `json:"enabled"`
	IntervalsDays  []int  `json:"intervalsDays"` // ví dụ [7,30]
}

func (s *InactivityService) GetMe(ctx context.Context, userID string) (*models.InactivityReminder, error) {
	return s.repo.GetByUser(ctx, userID)
}

func sanitizeIntervals(days []int) []int {
	out := make([]int, 0, len(days))
	seen := map[int]struct{}{}
	for _, d := range days {
		if d < 1 || d > 3650 {
			continue
		}
		if _, ok := seen[d]; ok {
			continue
		}
		seen[d] = struct{}{}
		out = append(out, d)
	}
	sort.Ints(out)
	return out
}

func (s *InactivityService) Upsert(ctx context.Context, userID string, in InactivityUpsertInput) (*models.InactivityReminder, error) {
	email := strings.TrimSpace(in.NotifyEmail)
	if email == "" {
		return nil, fmt.Errorf("notifyEmail là bắt buộc")
	}
	intervals := sanitizeIntervals(in.IntervalsDays)
	if len(intervals) == 0 {
		return nil, fmt.Errorf("intervalsDays rỗng (ví dụ 7, 30)")
	}
	now := time.Now().UTC()
	return s.repo.Upsert(ctx, userID, email, in.Enabled, intervals, now)
}

func (s *InactivityService) DeleteByUser(ctx context.Context, userID string) error {
	// Tạm không implement delete (dùng enabled=false) để giảm phạm vi.
	_, _ = userID, ctx
	return fmt.Errorf("not implemented")
}

func (s *InactivityService) ProcessDue(ctx context.Context) {
	// Mỗi phút chạy: duyệt các record enabled rồi tính inactivityDays = now-lastActiveAtSeen.
	now := time.Now().UTC()
	items, err := s.repo.ListAllEnabled(ctx)
	if err != nil {
		log.Printf("inactivity ListAllEnabled: %v", err)
		return
	}

	for _, it := range items {
		if !s.cfg.SMTPEnabled() {
			continue
		}
		if it.NotifyEmail == "" || len(it.IntervalsDays) == 0 {
			continue
		}

		// Load lastActiveAt from stats; nếu user chưa có activity -> bỏ qua.
		stats, err := s.stats.GetMe(ctx, it.UserID)
		if err != nil || stats == nil {
			continue
		}
		lastActive := stats.LastActiveAt
		if lastActive.IsZero() {
			continue
		}
		// Reset "đã gửi" nếu user hoạt động trở lại.
		if it.LastActiveSeenAt.IsZero() || !it.LastActiveSeenAt.Equal(lastActive) {
			_ = s.repo.UpdateState(ctx, it.UserID, lastActive, []int{}, now)
			it.LastActiveSeenAt = lastActive
			it.SentIntervals = []int{}
		}

		inactivityDays := int(now.Sub(lastActive).Hours() / 24)
		if inactivityDays <= 0 {
			continue
		}

		sentSet := map[int]struct{}{}
		for _, d := range it.SentIntervals {
			sentSet[d] = struct{}{}
		}

		for _, interval := range it.IntervalsDays {
			if inactivityDays < interval {
				continue
			}
			if _, sent := sentSet[interval]; sent {
				continue
			}

			// Send email.
			subj := "Mika English — động lực học từ vựng"
			body := fmt.Sprintf(
				"Chào bạn!\n\nBạn đã không học trong %d ngày.\nMika gợi ý: mở mục Quiz topic hoặc Học thẻ để ôn lại từ khó.\n\nChúc bạn học tốt!\n",
				interval,
			)
			if err := SendReminderEmail(s.cfg, it.NotifyEmail, subj, body); err != nil {
				log.Printf("inactivity send mail to %s: %v", it.NotifyEmail, err)
				continue
			}

			sentSet[interval] = struct{}{}
			newSent := make([]int, 0, len(sentSet))
			for d := range sentSet {
				newSent = append(newSent, d)
			}
			sort.Ints(newSent)
			_ = s.repo.UpdateState(ctx, it.UserID, lastActive, newSent, now)
		}
	}
}

