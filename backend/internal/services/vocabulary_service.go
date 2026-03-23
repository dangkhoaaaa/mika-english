package services

import (
	"context"
	"time"

	"mika-english-backend/internal/models"
	"mika-english-backend/internal/repositories"

	"go.mongodb.org/mongo-driver/bson"
)

type VocabularyService struct {
	repo *repositories.VocabularyRepository
}

func NewVocabularyService(repo *repositories.VocabularyRepository) *VocabularyService {
	return &VocabularyService{repo: repo}
}

func (s *VocabularyService) Create(ctx context.Context, item *models.Vocabulary) error {
	return s.repo.Create(ctx, item)
}

func (s *VocabularyService) ListByUser(ctx context.Context, userID string) ([]models.Vocabulary, error) {
	return s.repo.ListByUser(ctx, userID)
}

func (s *VocabularyService) UpdateByID(ctx context.Context, id, userID string, item *models.Vocabulary) error {
	return s.repo.UpdateByID(ctx, id, userID, bson.M{
		"vocabulary": item.Vocabulary,
		"pos":        item.POS,
		"class":      item.Class,
		"topic":      item.Topic,
		"meaning":    item.Meaning,
		"example":    item.Example,
		"updatedAt":  time.Now(),
	})
}

func (s *VocabularyService) DeleteByID(ctx context.Context, id, userID string) error {
	return s.repo.DeleteByID(ctx, id, userID)
}

func (s *VocabularyService) DeleteByTopic(ctx context.Context, userID, topic string) (int64, error) {
	return s.repo.DeleteByTopic(ctx, userID, topic)
}

func (s *VocabularyService) DeleteAll(ctx context.Context, userID string) (int64, error) {
	return s.repo.DeleteAllByUser(ctx, userID)
}
