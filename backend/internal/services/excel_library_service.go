package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"mika-english-backend/internal/models"
	"mika-english-backend/internal/repositories"
)

type ExcelLibraryService struct {
	repo     *repositories.ExcelShareRepository
	userRepo *repositories.UserRepository
}

func NewExcelLibraryService(repo *repositories.ExcelShareRepository, userRepo *repositories.UserRepository) *ExcelLibraryService {
	return &ExcelLibraryService{repo: repo, userRepo: userRepo}
}

type ExcelLibraryShareInput struct {
	Title    string `json:"title"`
	SheetURL string `json:"sheetUrl"`
}

type ExcelShareUserMini struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
	AvatarURL   string `json:"avatarUrl,omitempty"`
}

type ExcelLibraryItemDTO struct {
	ID        string            `json:"id"`
	Title     string            `json:"title"`
	SheetURL  string            `json:"sheetUrl"`
	CreatedAt string            `json:"createdAt"`
	User      ExcelShareUserMini `json:"user"`
}

type ExcelLibraryPage struct {
	Page  int64               `json:"page"`
	Limit int64               `json:"limit"`
	Total int64               `json:"total"`
	Items []ExcelLibraryItemDTO `json:"items"`
}

func (s *ExcelLibraryService) Share(ctx context.Context, userID string, in ExcelLibraryShareInput) error {
	title := strings.TrimSpace(in.Title)
	url := strings.TrimSpace(in.SheetURL)
	if title == "" {
		title = "Excel chưa đặt tên"
	}
	if url == "" || !strings.Contains(url, "docs.google.com/spreadsheets/") {
		return fmt.Errorf("sheetUrl không hợp lệ")
	}
	item := &models.ExcelShareItem{
		UserID:   userID,
		Title:    title,
		SheetURL: url,
	}
	return s.repo.Create(ctx, item)
}

func (s *ExcelLibraryService) ListPaged(ctx context.Context, page, limit int64) (*ExcelLibraryPage, error) {
	items, total, err := s.repo.ListPaged(ctx, page, limit)
	if err != nil {
		return nil, err
	}
	idsSet := map[string]struct{}{}
	for _, it := range items {
		if it.UserID != "" {
			idsSet[it.UserID] = struct{}{}
		}
	}
	ids := make([]string, 0, len(idsSet))
	for id := range idsSet {
		ids = append(ids, id)
	}
	users, _ := s.userRepo.ListByIDs(ctx, ids)
	userMap := map[string]models.User{}
	for _, u := range users {
		userMap[u.ID.Hex()] = u
	}
	out := make([]ExcelLibraryItemDTO, 0, len(items))
	for _, it := range items {
		u := userMap[it.UserID]
		out = append(out, ExcelLibraryItemDTO{
			ID:       it.ID.Hex(),
			Title:    it.Title,
			SheetURL: it.SheetURL,
			CreatedAt: it.CreatedAt.Format(time.RFC3339),
			User: ExcelShareUserMini{
				ID:          u.ID.Hex(),
				DisplayName: u.DisplayName,
				AvatarURL:   u.AvatarURL,
			},
		})
	}
	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	return &ExcelLibraryPage{
		Page:  page,
		Limit: limit,
		Total: total,
		Items: out,
	}, nil
}

