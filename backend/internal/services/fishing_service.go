package services

import (
	"context"
	"fmt"
	"math/rand"
	"strings"
	"time"
	"unicode"

	"mika-english-backend/internal/models"
	"mika-english-backend/internal/repositories"

	"golang.org/x/text/unicode/norm"
)

type FishRarity = string

const (
	FishD   FishRarity = "D"
	FishC   FishRarity = "C"
	FishB   FishRarity = "B"
	FishA   FishRarity = "A"
	FishS   FishRarity = "S"
	FishSS  FishRarity = "SS"
	FishSSS FishRarity = "SSS"
)

var fishTypes = []FishRarity{FishD, FishC, FishB, FishA, FishS, FishSS, FishSSS}

// Weighted by rarity (hiếm hơn => % nhỏ hơn).
var fishWeights = map[FishRarity]int{
	FishD:   450,
	FishC:   300,
	FishB:   150,
	FishA:   70,
	FishS:   25,
	FishSS:  8,
	FishSSS: 2,
}

var fishPoint = map[FishRarity]int{
	FishD:   2,
	FishC:   4,
	FishB:   8,
	FishA:   12,
	FishS:   20,
	FishSS:  30,
	FishSSS: 45,
}

// Timing window width (ms) càng hiếm càng nhỏ.
var fishWindow = map[FishRarity]int{
	FishD:   600,
	FishC:   450,
	FishB:   320,
	FishA:   220,
	FishS:   140,
	FishSS:  90,
	FishSSS: 60,
}

var mechanicDurationMs = 3000

type FishingStartRequest struct {
	Topic string `json:"topic"`
}

type FishingTimingDto struct {
	MechanicDurationMs int `json:"mechanicDurationMs"`
	TargetStartMs      int `json:"targetStartMs"`
	TargetEndMs        int `json:"targetEndMs"`
}

type FishingStartResponse struct {
	AttemptID string `json:"attemptId"`
	Topic     string `json:"topic"`

	BiteDelayMs int `json:"biteDelayMs"` // 5-30s

	FishType string `json:"fishType"`
	// fishSizeIndex for UI (0..6)
	FishSizeIndex int `json:"fishSizeIndex"`

	CardVocabularyID string `json:"cardVocabularyId"`
	CardVocabulary   string `json:"cardVocabulary"`
	CardMeaning      string `json:"cardMeaning"`

	Timing FishingTimingDto `json:"timing"`
}

type FishingSubmitRequest struct {
	AttemptID string `json:"attemptId"`
	ClickOffsetMs int `json:"clickOffsetMs"`
	AnswerText string `json:"answerText"`
}

type FishingSubmitResponse struct {
	TimingOk bool `json:"timingOk"`
	Correct   bool `json:"correct"`
	Caught    bool `json:"caught"`
	FishType  string `json:"fishType"`
	PointsGained int `json:"pointsGained"`
	Stats *models.UserStats `json:"stats"`
}

type FishingService struct {
	vocabRepo *repositories.VocabularyRepository
	repo      *repositories.FishingRepository
	stats     *StatsService
}

func NewFishingService(vocabRepo *repositories.VocabularyRepository, repo *repositories.FishingRepository, stats *StatsService) *FishingService {
	return &FishingService{vocabRepo: vocabRepo, repo: repo, stats: stats}
}

func fishSizeIndexOf(t string) int {
	switch t {
	case "D":
		return 0
	case "C":
		return 1
	case "B":
		return 2
	case "A":
		return 3
	case "S":
		return 4
	case "SS":
		return 5
	case "SSS":
		return 6
	default:
		return 0
	}
}

func pickFishType(rng *rand.Rand) FishRarity {
	sum := 0
	for _, t := range fishTypes {
		sum += fishWeights[t]
	}
	x := rng.Intn(sum)
	acc := 0
	for _, t := range fishTypes {
		acc += fishWeights[t]
		if x < acc {
			return t
		}
	}
	return FishD
}

func targetWindow(rng *rand.Rand, t FishRarity) (startMs, endMs int) {
	w := fishWindow[t]
	if w <= 0 {
		w = 200
	}
	if w > mechanicDurationMs {
		w = mechanicDurationMs
	}
	// pick window start from [0, duration-w]
	startMs = rng.Intn(mechanicDurationMs - w + 1)
	endMs = startMs + w
	return startMs, endMs
}

func normalizeForMatch(s string) string {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, "\u00a0", " ")
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, "đ", "d")
	s = strings.ReplaceAll(s, "Đ", "d")
	s = norm.NFD.String(s)
	out := strings.Builder{}
	out.Grow(len(s))
	for _, r := range s {
		if unicode.Is(unicode.Mn, r) {
			continue
		}
		out.WriteRune(r)
	}
	// collapse whitespace
	return strings.Join(strings.Fields(out.String()), " ")
}

func (s *FishingService) Start(ctx context.Context, userID string, req FishingStartRequest) (*FishingStartResponse, error) {
	topic := strings.TrimSpace(req.Topic)
	if topic == "" {
		return nil, fmt.Errorf("topic bắt buộc")
	}

	all, err := s.vocabRepo.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	cards := make([]models.Vocabulary, 0)
	for _, v := range all {
		if v.Topic == topic {
			cards = append(cards, v)
		}
	}
	if len(cards) == 0 {
		return nil, fmt.Errorf("topic không có từ")
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	fish := pickFishType(rng)
	card := cards[rng.Intn(len(cards))]

	// random bite delay 5-30s
	biteDelayMs := (5 + rng.Intn(26)) * 1000 // [5..30] => 5..30 inclusive

	ts, te := targetWindow(rng, fish)

	attempt := &models.FishingAttempt{
		UserID: userID,
		Topic: topic,

		FishType: fish,

		VocabularyID:       card.ID.Hex(),
		VocabularyValue:    card.Vocabulary,
		VocabularyMeaning:  card.Meaning,

		MechanicDurationMs: mechanicDurationMs,
		TargetStartMs:      ts,
		TargetEndMs:        te,
		Status:              "created",
	}
	id, err := s.repo.CreateAttempt(ctx, attempt)
	if err != nil {
		return nil, err
	}

	return &FishingStartResponse{
		AttemptID: id,
		Topic:     topic,
		BiteDelayMs: biteDelayMs,
		FishType: string(fish),
		FishSizeIndex: fishSizeIndexOf(string(fish)),

		CardVocabularyID: card.ID.Hex(),
		CardVocabulary:   card.Vocabulary,
		CardMeaning:      card.Meaning,
		Timing: FishingTimingDto{
			MechanicDurationMs: mechanicDurationMs,
			TargetStartMs:      ts,
			TargetEndMs:        te,
		},
	}, nil
}

func (s *FishingService) Submit(ctx context.Context, userID string, req FishingSubmitRequest) (*FishingSubmitResponse, error) {
	attempt, err := s.repo.GetAttempt(ctx, userID, req.AttemptID)
	if err != nil {
		return nil, err
	}
	if attempt.Status != "created" {
		return nil, fmt.Errorf("attempt không còn hợp lệ")
	}

	now := time.Now().UTC()
	click := req.ClickOffsetMs
	timingOk := click >= attempt.TargetStartMs && click <= attempt.TargetEndMs && click >= 0 && click <= attempt.MechanicDurationMs

	answerNorm := normalizeForMatch(req.AnswerText)
	correctNorm := normalizeForMatch(attempt.VocabularyMeaning)
	correct := timingOk && answerNorm != "" && answerNorm == correctNorm

	points := 0
	caught := false
	if correct {
		// save catch
		fishType := attempt.FishType
		points = fishPoint[FishRarity(fishType)]
		_ = s.repo.MarkAttemptCompleted(ctx, userID, req.AttemptID)
		catch := &models.FishCatch{
			UserID: userID,
			AttemptID: req.AttemptID,
			Topic: attempt.Topic,
			FishType: fishType,
			VocabularyID: attempt.VocabularyID,
			VocabularyValue: attempt.VocabularyValue,
			VocabularyMeaning: attempt.VocabularyMeaning,
			CaughtAt: now,
		}
		if err := s.repo.CreateCatch(ctx, catch); err != nil {
			return nil, err
		}
		caught = true
	}

	// Mark attempt completed even if fail, to prevent resubmits.
	_ = s.repo.MarkAttemptCompleted(ctx, userID, req.AttemptID)

	stats := (*models.UserStats)(nil)
	if correct {
		stats, err = s.stats.AddPointsAndUpdateRank(ctx, userID, points, "", now)
		if err != nil {
			return nil, err
		}
	} else {
		_ = s.stats.Touch(ctx, userID, now)
		stats, _ = s.stats.GetMe(ctx, userID)
	}

	return &FishingSubmitResponse{
		TimingOk: timingOk,
		Correct: correct,
		Caught: caught,
		FishType: attempt.FishType,
		PointsGained: points,
		Stats: stats,
	}, nil
}

