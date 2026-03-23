package services

import (
	"context"
	"fmt"
	"time"

	"mika-english-backend/internal/models"
	"mika-english-backend/internal/repositories"
)

type StatsService struct {
	repo *repositories.StatsRepository
}

func NewStatsService(repo *repositories.StatsRepository) *StatsService {
	return &StatsService{repo: repo}
}

func RankFromPoints(points int) string {
	// Thang rank mặc định (có thể chỉnh sau):
	// Đồng >= 0
	// Bạc >= 200
	// Vàng >= 500
	// Bạch Kim >= 1000
	// Kim Cương >= 2000
	// Cao Thủ >= 4000
	switch {
	case points >= 4000:
		return "Cao thủ"
	case points >= 2000:
		return "Kim cương"
	case points >= 1000:
		return "Bạch kim"
	case points >= 500:
		return "Vàng"
	case points >= 200:
		return "Bạc"
	default:
		return "Đồng"
	}
}

func (s *StatsService) EnsureBase(ctx context.Context, userID string) error {
	now := time.Now().UTC()
	return s.repo.EnsureBase(ctx, userID, now)
}

func (s *StatsService) GetMe(ctx context.Context, userID string) (*models.UserStats, error) {
	if err := s.EnsureBase(ctx, userID); err != nil {
		return nil, err
	}
	return s.repo.GetByUser(ctx, userID)
}

type PointsDelta struct {
	PointsDelta int
	NextStreak  *int
	NextRank    string
	NextDate    string
	LastActive  time.Time
}

func (s *StatsService) AddPointsAndUpdateRank(ctx context.Context, userID string, delta int, nextRank string, lastActive time.Time) (*models.UserStats, error) {
	if err := s.EnsureBase(ctx, userID); err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	if nextRank == "" {
		me, err := s.repo.GetByUser(ctx, userID)
		if err != nil {
			return nil, err
		}
		nextRank = RankFromPoints(me.Points + delta)
	}
	// streak/check-in state không đổi ở đây
	stats, err := s.repo.Upsert(ctx, userID, delta, nil, "", now, nextRank)
	if err != nil {
		return nil, err
	}
	_ = s.repo.UpdateLastActive(ctx, userID, lastActive)
	return stats, nil
}

func (s *StatsService) ApplyCheckIn(ctx context.Context, userID string, pointsDelta int, streakDays int, date string) (*models.UserStats, error) {
	if err := s.EnsureBase(ctx, userID); err != nil {
		return nil, err
	}
	stats, err := s.repo.GetByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	nextPoints := stats.Points + pointsDelta
	rank := RankFromPoints(nextPoints)
	updated, err := s.repo.SetCheckInState(ctx, userID, pointsDelta, streakDays, date, rank, now)
	if err != nil {
		return nil, err
	}
	_ = s.repo.UpdateLastActive(ctx, userID, now)
	return updated, nil
}

func (s *StatsService) Touch(ctx context.Context, userID string, lastActive time.Time) error {
	return s.repo.UpdateLastActive(ctx, userID, lastActive)
}

func (s *StatsService) DebugRank(points int) string {
	return fmt.Sprintf("%s", RankFromPoints(points))
}

