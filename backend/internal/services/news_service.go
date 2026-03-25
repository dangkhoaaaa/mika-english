package services

import (
	"context"

	"mika-english-backend/internal/models"
	"mika-english-backend/internal/repositories"
)

type NewsService struct {
	repo *repositories.NewsRepository
}

func NewNewsService(repo *repositories.NewsRepository) *NewsService {
	return &NewsService{repo: repo}
}

func (s *NewsService) CreatePost(ctx context.Context, post *models.NewsPost) error {
	return s.repo.CreatePost(ctx, post)
}

func (s *NewsService) ListPosts(ctx context.Context, page, limit int64) ([]models.NewsPost, error) {
	return s.repo.ListPosts(ctx, page, limit)
}

func (s *NewsService) LikePost(ctx context.Context, postID string) error {
	return s.repo.LikePost(ctx, postID)
}

func (s *NewsService) AddComment(ctx context.Context, c *models.Comment) error {
	return s.repo.AddComment(ctx, c)
}

func (s *NewsService) ListCommentsByPost(ctx context.Context, postID string) ([]models.Comment, error) {
	return s.repo.ListCommentsByPost(ctx, postID)
}

func (s *NewsService) SaveWord(ctx context.Context, item *models.SavedWord) error {
	return s.repo.SaveWord(ctx, item)
}

func (s *NewsService) DeletePost(ctx context.Context, userID string, postID string) (bool, error) {
	return s.repo.DeletePostByIDAndUser(ctx, userID, postID)
}
