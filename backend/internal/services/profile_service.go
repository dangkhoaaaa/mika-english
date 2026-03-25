package services

import (
	"context"
	"strings"

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

func maskEmailHideFirst5(email string) string {
	email = strings.TrimSpace(email)
	if email == "" {
		return ""
	}
	at := strings.Index(email, "@")
	if at <= 0 {
		// không đúng format, cứ che 5 ký tự đầu nếu có
		if len(email) <= 5 {
			return "*****"
		}
		return "*****" + email[5:]
	}
	local := email[:at]
	domain := email[at:]
	if len(local) <= 5 {
		return "*****" + domain
	}
	return "*****" + local[5:] + domain
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
	if user != nil {
		// Email là nhạy cảm: khi xem profile người khác chỉ trả về email đã che.
		user.Email = maskEmailHideFirst5(user.Email)
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
	users, err := s.userRepo.SearchUsers(ctx, q, limit)
	if err != nil {
		return nil, err
	}
	for i := range users {
		users[i].Email = maskEmailHideFirst5(users[i].Email)
	}
	return users, nil
}

func (s *ProfileService) UpdateMe(ctx context.Context, userID, displayName, avatarURL, coverURL string) error {
	return s.userRepo.UpdateProfile(ctx, userID, displayName, avatarURL, coverURL)
}

