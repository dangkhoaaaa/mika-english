package services

import (
	"context"

	"mika-english-backend/internal/repositories"
)

type LeaderboardService struct {
	statsRepo   *repositories.StatsRepository
	fishingRepo *repositories.FishingRepository
	userRepo    *repositories.UserRepository
}

func NewLeaderboardService(stats *repositories.StatsRepository, fish *repositories.FishingRepository, user *repositories.UserRepository) *LeaderboardService {
	return &LeaderboardService{statsRepo: stats, fishingRepo: fish, userRepo: user}
}

type LeaderboardUserRow struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
	AvatarURL   string `json:"avatarUrl,omitempty"`
	Rank        string `json:"rank,omitempty"`
	Points      int    `json:"points,omitempty"`
	Coins       int    `json:"coins,omitempty"`
	TotalCatches int   `json:"totalCatches,omitempty"`
	TotalUnique int    `json:"totalUnique,omitempty"`
}

func (s *LeaderboardService) TopPoints(ctx context.Context, limit int64) ([]LeaderboardUserRow, error) {
	stats, err := s.statsRepo.TopByPoints(ctx, limit)
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(stats))
	for _, st := range stats {
		ids = append(ids, st.UserID)
	}
	users, err := s.userRepo.ListByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	userMap := map[string]string{}
	avatarMap := map[string]string{}
	for _, u := range users {
		userMap[u.ID.Hex()] = u.DisplayName
		avatarMap[u.ID.Hex()] = u.AvatarURL
	}

	out := make([]LeaderboardUserRow, 0, len(stats))
	for _, st := range stats {
		out = append(out, LeaderboardUserRow{
			UserID:      st.UserID,
			DisplayName: pickName(userMap[st.UserID], st.UserID),
			AvatarURL:   avatarMap[st.UserID],
			Rank:        st.Rank,
			Points:      st.Points,
		})
	}
	return out, nil
}

func (s *LeaderboardService) TopFish(ctx context.Context, limit int) ([]LeaderboardUserRow, error) {
	top, err := s.fishingRepo.TopUsersByFishCount(ctx, limit)
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(top))
	for _, t := range top {
		ids = append(ids, t.UserID)
	}
	users, err := s.userRepo.ListByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	userMap := map[string]string{}
	avatarMap := map[string]string{}
	for _, u := range users {
		userMap[u.ID.Hex()] = u.DisplayName
		avatarMap[u.ID.Hex()] = u.AvatarURL
	}

	out := make([]LeaderboardUserRow, 0, len(top))
	for _, t := range top {
		out = append(out, LeaderboardUserRow{
			UserID:      t.UserID,
			DisplayName: pickName(userMap[t.UserID], t.UserID),
			AvatarURL:   avatarMap[t.UserID],
			TotalCatches: t.TotalCatches,
			TotalUnique: t.TotalUnique,
		})
	}
	return out, nil
}

func (s *LeaderboardService) TopCoins(ctx context.Context, limit int64) ([]LeaderboardUserRow, error) {
	stats, err := s.statsRepo.TopByCoins(ctx, limit)
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(stats))
	for _, st := range stats {
		ids = append(ids, st.UserID)
	}
	users, err := s.userRepo.ListByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	userMap := map[string]string{}
	avatarMap := map[string]string{}
	for _, u := range users {
		userMap[u.ID.Hex()] = u.DisplayName
		avatarMap[u.ID.Hex()] = u.AvatarURL
	}
	out := make([]LeaderboardUserRow, 0, len(stats))
	for _, st := range stats {
		out = append(out, LeaderboardUserRow{
			UserID:      st.UserID,
			DisplayName: pickName(userMap[st.UserID], st.UserID),
			AvatarURL:   avatarMap[st.UserID],
			Coins:       st.Coins,
		})
	}
	return out, nil
}

func pickName(name, fallback string) string {
	if name != "" {
		return name
	}
	if len(fallback) > 8 {
		return "user_" + fallback[:8]
	}
	return "user_" + fallback
}

