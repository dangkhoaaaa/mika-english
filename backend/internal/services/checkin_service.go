package services

import (
	"context"
	"fmt"
	"time"

	"mika-english-backend/internal/models"
	"mika-english-backend/internal/repositories"
)

type CheckInService struct {
	stats   *StatsService
	repo    *repositories.CheckInRepository
}

func NewCheckInService(stats *StatsService, repo *repositories.CheckInRepository) *CheckInService {
	return &CheckInService{stats: stats, repo: repo}
}

func dateUTC(t time.Time) string { return t.UTC().Format("2006-01-02") }

func streakPoints(streakDays int) int {
	// Gợi ý theo hệ thống lớn: điểm tăng dần theo streak nhưng có trần.
	// base 10, mỗi ngày streak thêm +2, tối đa +20.
	base := 10
	extra := (streakDays - 1) * 2
	if extra < 0 {
		extra = 0
	}
	if extra > 20 {
		extra = 20
	}
	return base + extra
}

func (s *CheckInService) CheckIn(ctx context.Context, userID string) (*models.UserStats, *models.DailyCheckIn, error) {
	now := time.Now().UTC()
	today := dateUTC(now)

	already, err := s.repo.HasCheckedIn(ctx, userID, today)
	if err != nil {
		return nil, nil, err
	}
	if already {
		return nil, nil, fmt.Errorf("đã check-in hôm nay")
	}

	stats, err := s.stats.GetMe(ctx, userID)
	if err != nil {
		return nil, nil, err
	}

	// Tính streak: chỉ tăng nếu check-in đúng ngày hôm qua.
	nextStreak := 1
	if stats.LastCheckInDate != "" {
		last, parseErr := time.Parse("2006-01-02", stats.LastCheckInDate)
		if parseErr == nil {
			yesterday := last.AddDate(0, 0, 1).Format("2006-01-02")
			if yesterday == today {
				nextStreak = stats.StreakDays + 1
			} else {
				nextStreak = 1
			}
		}
	}

	points := streakPoints(nextStreak)

	updatedStats, err := s.stats.ApplyCheckIn(ctx, userID, points, nextStreak, today)
	if err != nil {
		return nil, nil, err
	}

	checkin := &models.DailyCheckIn{
		UserID:    userID,
		Date:      today,
		Points:    points,
		StreakDays: nextStreak,
	}
	if err := s.repo.Create(ctx, checkin); err != nil {
		return nil, nil, err
	}

	return updatedStats, checkin, nil
}

