package services

import (
	"context"
	"fmt"

	"mika-english-backend/internal/models"
	"mika-english-backend/internal/repositories"
)

type VocabularyImportService struct {
	vocabRepo    *repositories.VocabularyRepository
	bookmarkRepo *repositories.BookmarkRepository
	reminderRepo *repositories.ReminderRepository
}

func NewVocabularyImportService(
	vocabRepo *repositories.VocabularyRepository,
	bookmarkRepo *repositories.BookmarkRepository,
	reminderRepo *repositories.ReminderRepository,
) *VocabularyImportService {
	return &VocabularyImportService{
		vocabRepo:    vocabRepo,
		bookmarkRepo: bookmarkRepo,
		reminderRepo: reminderRepo,
	}
}

// SyncExcel sync vocabularies by incoming rows (grouped by topic).
// For each topic included in the request, DB is treated as authoritative to that topic only.
func (s *VocabularyImportService) SyncExcel(ctx context.Context, userID string, rows []models.VocabularyImportRow) (int, []string, error) {
	if len(rows) == 0 {
		return 0, nil, fmt.Errorf("rows rỗng")
	}

	byTopic := make(map[string][]models.VocabularyImportRow, 8)
	for _, r := range rows {
		topic := r.Topic
		if topic == "" {
			// keep empty string (từ không có chủ đề)
			topic = ""
		}
		byTopic[topic] = append(byTopic[topic], r)
	}

	totalDeleted := 0
	deletedVocabularyIDs := make([]string, 0)
	topics := make([]string, 0, len(byTopic))

	for topic, rowsInTopic := range byTopic {
		topics = append(topics, topic)
		deletedHex, err := s.vocabRepo.SyncByTopic(ctx, userID, topic, rowsInTopic)
		if err != nil {
			return 0, nil, err
		}
		totalDeleted += len(deletedHex)
		deletedVocabularyIDs = append(deletedVocabularyIDs, deletedHex...)
	}

	// Cleanup references for deleted vocabulary docs.
	if len(deletedVocabularyIDs) > 0 {
		_ = s.bookmarkRepo.DeleteByVocabularyIDs(ctx, userID, deletedVocabularyIDs)
		_ = s.reminderRepo.RemoveVocabularyIDs(ctx, userID, deletedVocabularyIDs)
	}

	return totalDeleted, topics, nil
}

