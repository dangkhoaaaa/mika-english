package services

import (
	"context"

	"mika-english-backend/internal/models"
	"mika-english-backend/internal/repositories"
)

type BookmarkService struct {
	bookmarks *repositories.BookmarkRepository
	vocab     *repositories.VocabularyRepository
}

func NewBookmarkService(b *repositories.BookmarkRepository, v *repositories.VocabularyRepository) *BookmarkService {
	return &BookmarkService{bookmarks: b, vocab: v}
}

func (s *BookmarkService) Add(ctx context.Context, userID, vocabularyID string) error {
	return s.bookmarks.Add(ctx, userID, vocabularyID)
}

func (s *BookmarkService) Remove(ctx context.Context, userID, vocabularyID string) error {
	return s.bookmarks.Remove(ctx, userID, vocabularyID)
}

func (s *BookmarkService) ListVocabularies(ctx context.Context, userID string) ([]models.Vocabulary, error) {
	ids, err := s.bookmarks.ListVocabIDs(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.vocab.ListByIDsForUser(ctx, userID, ids)
}

func (s *BookmarkService) ListVocabIDs(ctx context.Context, userID string) ([]string, error) {
	return s.bookmarks.ListVocabIDs(ctx, userID)
}

func (s *BookmarkService) IsBookmarked(ctx context.Context, userID, vocabularyID string) (bool, error) {
	return s.bookmarks.IsBookmarked(ctx, userID, vocabularyID)
}

func (s *BookmarkService) DeleteAllByUser(ctx context.Context, userID string) error {
	return s.bookmarks.DeleteAllByUser(ctx, userID)
}
