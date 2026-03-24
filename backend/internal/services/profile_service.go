package services

import (
	"context"

	"mika-english-backend/internal/models"
	"mika-english-backend/internal/repositories"
)

type ProfileService struct {
	userRepo    *repositories.UserRepository
	statsRepo   *repositories.StatsRepository
	newsRepo    *repositories.NewsRepository
	fishingRepo *repositories.FishingRepository
}

func NewProfileService(userRepo *repositories.UserRepository, statsRepo *repositories.StatsRepository, newsRepo *repositories.NewsRepository, fishingRepo *repositories.FishingRepository) *ProfileService {
	return &ProfileService{userRepo: userRepo, statsRepo: statsRepo, newsRepo: newsRepo, fishingRepo: fishingRepo}
}

type MyProfileResponse struct {
	User         *models.User                 `json:"user"`
	Stats        *models.UserStats            `json:"stats"`
	Posts        []models.NewsPost            `json:"posts"`
	FishSummary  *repositories.FishingAchievements `json:"fishSummary"`
}

func (s *ProfileService) Me(ctx context.Context, userID string) (*MyProfileResponse, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	stats, err := s.statsRepo.GetByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	posts, err := s.newsRepo.ListPostsByUser(ctx, userID, 1, 50)
	if err != nil {
		return nil, err
	}
	fish, err := s.fishingRepo.GetAchievements(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &MyProfileResponse{
		User: user,
		Stats: stats,
		Posts: posts,
		FishSummary: fish,
	}, nil
}

func (s *ProfileService) ByUserID(ctx context.Context, userID string) (*MyProfileResponse, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	stats, err := s.statsRepo.GetByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	posts, err := s.newsRepo.ListPostsByUser(ctx, userID, 1, 50)
	if err != nil {
		return nil, err
	}
	fish, err := s.fishingRepo.GetAchievements(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &MyProfileResponse{
		User: user,
		Stats: stats,
		Posts: posts,
		FishSummary: fish,
	}, nil
}

func (s *ProfileService) SearchUsers(ctx context.Context, q string, limit int64) ([]models.User, error) {
	return s.userRepo.SearchUsers(ctx, q, limit)
}

func (s *ProfileService) UpdateMe(ctx context.Context, userID, displayName, avatarURL, coverURL string) error {
	return s.userRepo.UpdateProfile(ctx, userID, displayName, avatarURL, coverURL)
}

