package services

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"mika-english-backend/internal/models"
	"mika-english-backend/internal/repositories"
)

type QuizService struct {
	vocabRepo *repositories.VocabularyRepository
	quizRepo  *repositories.QuizRepository
	stats     *StatsService
}

func NewQuizService(
	vocabRepo *repositories.VocabularyRepository,
	quizRepo *repositories.QuizRepository,
	stats *StatsService,
) *QuizService {
	return &QuizService{vocabRepo: vocabRepo, quizRepo: quizRepo, stats: stats}
}

const (
	QuizPointCorrect = 5
	QuizPointWrong   = -5
)

type QuizGenerateRequest struct {
	Topic string `json:"topic"`
	Count int    `json:"count"`
}

type QuizOptionDto struct {
	VocabularyID string `json:"vocabularyId"`
	Value        string `json:"value"` // vocabulary field
}

type QuizQuestionDto struct {
	QuestionMeaning string           `json:"questionMeaning"`
	Options         []QuizOptionDto `json:"options"`
}

type QuizGenerateResponse struct {
	AttemptID string              `json:"attemptId"`
	Topic     string              `json:"topic"`
	Total     int                 `json:"total"`
	Questions []QuizQuestionDto  `json:"questions"`
	// Points/Ranks sẽ chỉ cập nhật khi submit.
}

type QuizSubmitRequest struct {
	AttemptID string   `json:"attemptId"`
	Answers   []string `json:"answers"` // vocabularyId selected per question
}

type QuizSubmitResponse struct {
	Score int                `json:"score"`
	Stats *models.UserStats  `json:"stats"`
}

func sampleUnique(rng *rand.Rand, list []models.Vocabulary, n int) []models.Vocabulary {
	if n >= len(list) {
		// return shallow copy
		out := make([]models.Vocabulary, 0, len(list))
		out = append(out, list...)
		return out
	}
	perm := rng.Perm(len(list))
	out := make([]models.Vocabulary, 0, n)
	for i := 0; i < n; i++ {
		out = append(out, list[perm[i]])
	}
	return out
}

func (s *QuizService) Generate(ctx context.Context, userID string, req QuizGenerateRequest) (*QuizGenerateResponse, error) {
	topic := req.Topic
	if topic == "" {
		return nil, fmt.Errorf("topic không hợp lệ")
	}
	count := req.Count
	if count <= 0 {
		count = 5
	}
	if count > 20 {
		count = 20
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
	if len(cards) < 4 {
		return nil, fmt.Errorf("topic này cần ít nhất 4 từ để tạo trắc nghiệm")
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	questionCards := sampleUnique(rng, cards, count)
	questions := make([]models.QuizQuestion, 0, len(questionCards))
	questionDtos := make([]QuizQuestionDto, 0, len(questionCards))

	for _, qc := range questionCards {
		// options: pick 3 wrongs + correct
		others := make([]models.Vocabulary, 0, len(cards)-1)
		for _, v := range cards {
			if v.ID.Hex() == qc.ID.Hex() {
				continue
			}
			others = append(others, v)
		}
		wrongs := sampleUnique(rng, others, 3)
		optionIDs := make([]string, 0, 4)
		optionIDs = append(optionIDs, qc.ID.Hex())
		for _, w := range wrongs {
			optionIDs = append(optionIDs, w.ID.Hex())
		}

		// build DTO options text
		optionsDto := make([]QuizOptionDto, 0, 4)
		idToCard := map[string]models.Vocabulary{
			qc.ID.Hex(): qc,
		}
		for _, w := range wrongs {
			idToCard[w.ID.Hex()] = w
		}
		// shuffle option ids so correct not always first
		rng.Shuffle(len(optionIDs), func(i, j int) { optionIDs[i], optionIDs[j] = optionIDs[j], optionIDs[i] })

		for _, id := range optionIDs {
			card := idToCard[id]
			optionsDto = append(optionsDto, QuizOptionDto{VocabularyID: id, Value: card.Vocabulary})
		}

		questions = append(questions, models.QuizQuestion{
			QuestionVocabularyID: qc.ID.Hex(),
			CorrectVocabularyID:  qc.ID.Hex(),
			OptionVocabularyIDs:  optionIDs,
		})

		questionDtos = append(questionDtos, QuizQuestionDto{
			QuestionMeaning: qc.Meaning,
			Options:         optionsDto,
		})
	}

	session := &models.QuizSession{
		UserID:    userID,
		Topic:     topic,
		Total:     len(questionCards),
		Completed: false,
		Questions: questions,
	}
	oid, err := s.quizRepo.Create(ctx, session)
	if err != nil {
		return nil, err
	}

	return &QuizGenerateResponse{
		AttemptID: oid.Hex(),
		Topic:     topic,
		Total:     len(questionCards),
		Questions: questionDtos,
	}, nil
}

func (s *QuizService) Submit(ctx context.Context, userID string, req QuizSubmitRequest) (*QuizSubmitResponse, error) {
	session, err := s.quizRepo.GetByID(ctx, req.AttemptID)
	if err != nil {
		return nil, err
	}
	if session.UserID != userID {
		return nil, fmt.Errorf("không hợp lệ: attempt này của user khác")
	}
	if session.Completed {
		return nil, fmt.Errorf("attempt đã hoàn thành")
	}
	if len(req.Answers) != len(session.Questions) {
		return nil, fmt.Errorf("số đáp án không khớp")
	}

	score := 0
	for i, q := range session.Questions {
		selected := req.Answers[i]
		if selected == q.CorrectVocabularyID {
			score += QuizPointCorrect
		} else {
			score += QuizPointWrong
		}
	}

	if err := s.quizRepo.MarkCompletedAndScore(ctx, req.AttemptID, score); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	stats, err := s.stats.AddPointsAndUpdateRank(ctx, userID, score, "", now)
	if err != nil {
		return nil, err
	}

	return &QuizSubmitResponse{
		Score: score,
		Stats: stats,
	}, nil
}

