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
	FishD      FishRarity = "D"
	FishC      FishRarity = "C"
	FishB      FishRarity = "B"
	FishA      FishRarity = "A"
	FishAPlus  FishRarity = "A+"
	FishS      FishRarity = "S"
	FishSPlus  FishRarity = "S+"
	FishSS     FishRarity = "SS"
	FishSSPlus FishRarity = "SS+"
	FishSSS    FishRarity = "SSS"
	FishSSSPlus FishRarity = "SSS+"
	FishSSR    FishRarity = "SSR"
	FishUR     FishRarity = "UR"
	FishEX     FishRarity = "EX"
	FishMythic FishRarity = "Mythic"
	FishDivine FishRarity = "Divine"
)

var fishTypes = []FishRarity{
	FishD, FishC, FishB, FishA, FishAPlus,
	FishS, FishSPlus,
	FishSS, FishSSPlus,
	FishSSS, FishSSSPlus,
	FishSSR, FishUR,
	FishEX, FishMythic, FishDivine,
}

// Weighted by rarity (hiếm hơn => % nhỏ hơn).
var fishWeights = map[FishRarity]int{
	FishD:      560,
	FishC:      380,
	FishB:      220,
	FishA:      120,
	FishAPlus:   70,
	FishS:       40,
	FishSPlus:   22,
	FishSS:      12,
	FishSSPlus:   6,
	FishSSS:      3,
	FishSSSPlus:  2,
	FishSSR:      1,
	FishUR:       1,
	FishEX:       1,
	FishMythic:   1,
	FishDivine:   1,
}

var fishPoint = map[FishRarity]int{
	FishD:      2,
	FishC:      4,
	FishB:      8,
	FishA:      12,
	FishAPlus:  16,
	FishS:      22,
	FishSPlus:  28,
	FishSS:     36,
	FishSSPlus: 45,
	FishSSS:    58,
	FishSSSPlus: 72,
	FishSSR:    90,
	FishUR:     115,
	FishEX:     145,
	FishMythic: 190,
	FishDivine: 260,
}

// Timing window width (ms) càng hiếm càng nhỏ.
var fishWindow = map[FishRarity]int{
	FishD:      620,
	FishC:      480,
	FishB:      360,
	FishA:      260,
	FishAPlus:  220,
	FishS:      170,
	FishSPlus:  140,
	FishSS:     115,
	FishSSPlus: 95,
	FishSSS:    75,
	FishSSSPlus: 62,
	FishSSR:    52,
	FishUR:     44,
	FishEX:     38,
	FishMythic: 34,
	FishDivine: 30,
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

type RodInfo struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Price       int     `json:"price"`
	BiteFactor  float64 `json:"biteFactor"`  // <1 giảm thời gian chờ cá cắn
	WindowBonus float64 `json:"windowBonus"` // +0.1 = nới timing window 10%
}

func shopRods() []RodInfo {
	return []RodInfo{
		{ID: "basic", Name: "Cần tre (Basic)", Price: 0, BiteFactor: 1.0, WindowBonus: 0.0},
		{ID: "bronze", Name: "Cần đồng", Price: 120, BiteFactor: 0.92, WindowBonus: 0.10},
		{ID: "silver", Name: "Cần bạc", Price: 320, BiteFactor: 0.86, WindowBonus: 0.10},
		{ID: "gold", Name: "Cần vàng", Price: 650, BiteFactor: 0.80, WindowBonus: 0.10},
		{ID: "mythic-rod", Name: "Cần Mythic", Price: 1500, BiteFactor: 0.72, WindowBonus: 0.10},
	}
}

// ShopRodsPublic exposes shop rods for handlers.
func ShopRodsPublic() []RodInfo {
	return shopRods()
}

func rodByID(id string) (RodInfo, bool) {
	for _, r := range shopRods() {
		if r.ID == id {
			return r, true
		}
	}
	return RodInfo{}, false
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
	case "A+":
		return 4
	case "S":
		return 5
	case "S+":
		return 6
	case "SS":
		return 7
	case "SS+":
		return 8
	case "SSS":
		return 9
	case "SSS+":
		return 10
	case "SSR":
		return 11
	case "UR":
		return 12
	case "EX":
		return 13
	case "Mythic":
		return 14
	case "Divine":
		return 15
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

func targetWindow(rng *rand.Rand, t FishRarity, windowBonus float64) (startMs, endMs int) {
	w := fishWindow[t]
	if w <= 0 {
		w = 200
	}
	if windowBonus > 0 {
		w = int(float64(w) * (1.0 + windowBonus))
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
	// Apply rod effects (giảm chờ + nới timing window)
	windowBonus := 0.0
	if st, _ := s.stats.GetMe(ctx, userID); st != nil {
		rodID := strings.TrimSpace(st.Rod)
		if rodID == "" {
			rodID = "basic"
		}
		if rod, ok := rodByID(rodID); ok {
			if rod.BiteFactor > 0 && rod.BiteFactor < 1.0 {
				biteDelayMs = int(float64(biteDelayMs) * rod.BiteFactor)
				if biteDelayMs < 2500 {
					biteDelayMs = 2500
				}
			}
			if rod.WindowBonus > 0 {
				windowBonus = rod.WindowBonus
			}
		}
	}

	ts, te := targetWindow(rng, fish, windowBonus)

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

var fishSellPrice = map[FishRarity]int{
	FishD:      1,
	FishC:      2,
	FishB:      4,
	FishA:      7,
	FishAPlus:  10,
	FishS:      14,
	FishSPlus:  18,
	FishSS:     24,
	FishSSPlus: 30,
	FishSSS:    38,
	FishSSSPlus: 48,
	FishSSR:    60,
	FishUR:     80,
	FishEX:     110,
	FishMythic: 150,
	FishDivine: 220,
}

type FishingSellRequest struct {
	VocabularyID string `json:"vocabularyId"`
	FishType     string `json:"fishType,omitempty"`
}

type FishingSellResponse struct {
	CoinsGained int             `json:"coinsGained"`
	Sold        *models.FishCatch `json:"sold"`
	Stats       *models.UserStats `json:"stats"`
}

func (s *FishingService) Sell(ctx context.Context, userID string, req FishingSellRequest) (*FishingSellResponse, error) {
	vocabID := strings.TrimSpace(req.VocabularyID)
	if vocabID == "" {
		return nil, fmt.Errorf("missing vocabularyId")
	}
	fishType := strings.TrimSpace(req.FishType)
	catch, err := s.repo.SellOneCatch(ctx, userID, vocabID, fishType)
	if err != nil {
		return nil, err
	}
	price := fishSellPrice[FishRarity(catch.FishType)]
	if price <= 0 {
		price = 1
	}
	st, err := s.stats.AddCoins(ctx, userID, price)
	if err != nil {
		return nil, err
	}
	return &FishingSellResponse{CoinsGained: price, Sold: catch, Stats: st}, nil
}

type FishingBuyRodRequest struct {
	RodID string `json:"rodId"`
}

type FishingBuyRodResponse struct {
	Ok    bool            `json:"ok"`
	Stats *models.UserStats `json:"stats,omitempty"`
	Error string          `json:"error,omitempty"`
}

func (s *FishingService) BuyRod(ctx context.Context, userID string, rodID string) (*FishingBuyRodResponse, error) {
	rodID = strings.TrimSpace(rodID)
	if rodID == "" {
		return &FishingBuyRodResponse{Ok: false, Error: "missing rodId"}, nil
	}
	rod, ok := rodByID(rodID)
	if !ok {
		return &FishingBuyRodResponse{Ok: false, Error: "rod not found"}, nil
	}
	if err := s.stats.EnsureBase(ctx, userID); err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	ok2, st, err := s.stats.repo.BuyRod(ctx, userID, rod.ID, rod.Price, now)
	if err != nil {
		return nil, err
	}
	if !ok2 {
		return &FishingBuyRodResponse{Ok: false, Error: "không đủ tiền"}, nil
	}
	return &FishingBuyRodResponse{Ok: true, Stats: st}, nil
}

func (s *FishingService) EquipRod(ctx context.Context, userID string, rodID string) (*FishingBuyRodResponse, error) {
	rodID = strings.TrimSpace(rodID)
	if rodID == "" {
		return &FishingBuyRodResponse{Ok: false, Error: "missing rodId"}, nil
	}
	if _, ok := rodByID(rodID); !ok {
		return &FishingBuyRodResponse{Ok: false, Error: "rod not found"}, nil
	}
	if err := s.stats.EnsureBase(ctx, userID); err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	ok2, st, err := s.stats.repo.EquipRod(ctx, userID, rodID, now)
	if err != nil {
		return nil, err
	}
	if !ok2 {
		return &FishingBuyRodResponse{Ok: false, Error: "chưa sở hữu cần câu này"}, nil
	}
	return &FishingBuyRodResponse{Ok: true, Stats: st}, nil
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

