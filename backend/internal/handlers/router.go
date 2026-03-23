package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"mika-english-backend/internal/config"
	"mika-english-backend/internal/db"
	"mika-english-backend/internal/models"
	"mika-english-backend/internal/repositories"
	"mika-english-backend/internal/services"
)

type registerRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
}
type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}
type refreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}
type googleLoginRequest struct {
	IDToken     string `json:"idToken"`
	DisplayName string `json:"displayName"`
}

func NewRouter() http.Handler {
	cfg := config.Load()
	client, err := db.Connect(context.Background(), cfg.MongoURI)
	if err != nil {
		panic(err)
	}
	database := client.Database(cfg.MongoDBName)
	if err := db.EnsureIndexes(context.Background(), database); err != nil {
		panic(err)
	}

	userRepo := repositories.NewUserRepository(database)
	vocabRepo := repositories.NewVocabularyRepository(database)
	bookmarkRepo := repositories.NewBookmarkRepository(database)
	reminderRepo := repositories.NewReminderRepository(database)
	statsRepo := repositories.NewStatsRepository(database)
	checkinRepo := repositories.NewCheckInRepository(database)
	quizRepo := repositories.NewQuizRepository(database)
	inactivityRepo := repositories.NewInactivityReminderRepository(database)
	fishingRepo := repositories.NewFishingRepository(database)
	tokenRepo := repositories.NewTokenRepository(database)
	newsRepo := repositories.NewNewsRepository(database)

	authService := services.NewAuthService(userRepo, tokenRepo, cfg.JWTSecretKey, cfg.GoogleClient)
	vocabService := services.NewVocabularyService(vocabRepo)
	bookmarkService := services.NewBookmarkService(bookmarkRepo, vocabRepo)
	reminderService := services.NewReminderService(cfg, reminderRepo, vocabRepo)
	statsService := services.NewStatsService(statsRepo)
	checkInService := services.NewCheckInService(statsService, checkinRepo)
	quizService := services.NewQuizService(vocabRepo, quizRepo, statsService)
	inactivityService := services.NewInactivityService(cfg, inactivityRepo, statsService)
	fishingService := services.NewFishingService(vocabRepo, fishingRepo, statsService)
	vocabImportService := services.NewVocabularyImportService(vocabRepo, bookmarkRepo, reminderRepo)
	newsService := services.NewNewsService(newsRepo)

	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
			reminderService.ProcessDue(ctx)
			cancel()
		}
	}()

	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
			inactivityService.ProcessDue(ctx)
			cancel()
		}
	}()

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	mux.HandleFunc("/api/v1/auth/register", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		var req registerRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
			return
		}
		pair, err := authService.Register(r.Context(), req.Email, req.Password, req.DisplayName)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusCreated, pair)
	})
	mux.HandleFunc("/api/v1/auth/login", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		var req loginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
			return
		}
		pair, err := authService.Login(r.Context(), req.Email, req.Password)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, pair)
	})
	mux.HandleFunc("/api/v1/auth/google", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		var req googleLoginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
			return
		}
		pair, err := authService.GoogleLogin(r.Context(), req.IDToken, req.DisplayName)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, pair)
	})
	mux.HandleFunc("/api/v1/auth/refresh", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		var req refreshRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RefreshToken == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
			return
		}
		pair, err := authService.Refresh(r.Context(), req.RefreshToken)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, pair)
	})
	mux.HandleFunc("/api/v1/auth/logout", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		var req refreshRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
			return
		}
		access := ""
		auth := r.Header.Get("Authorization")
		parts := strings.Split(auth, " ")
		if len(parts) == 2 {
			access = parts[1]
		}
		_ = authService.Logout(r.Context(), access, req.RefreshToken)
		writeJSON(w, http.StatusOK, map[string]string{"message": "logout success"})
	})

	mux.HandleFunc("/api/v1/vocabularies", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		userID := getUserID(r.Context())
		switch r.Method {
		case http.MethodGet:
			items, err := vocabService.ListByUser(r.Context(), userID)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusOK, items)
		case http.MethodPost:
			var item models.Vocabulary
			if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
				return
			}
			if strings.TrimSpace(item.Vocabulary) == "" || strings.TrimSpace(item.Meaning) == "" {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "vocabulary and meaning are required"})
				return
			}
			item.UserID = userID
			if err := vocabService.Create(r.Context(), &item); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusCreated, item)
		default:
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
	}))
	mux.HandleFunc("/api/v1/vocabularies/update", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		var req struct {
			ID string `json:"id"`
			models.Vocabulary
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ID == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
			return
		}
		if err := vocabService.UpdateByID(r.Context(), req.ID, getUserID(r.Context()), &req.Vocabulary); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"message": "updated"})
	}))
	mux.HandleFunc("/api/v1/vocabularies/delete", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		id := r.URL.Query().Get("id")
		if id == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing id"})
			return
		}
		uid := getUserID(r.Context())
		if err := vocabService.DeleteByID(r.Context(), id, uid); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		_ = bookmarkService.Remove(r.Context(), uid, id)
		writeJSON(w, http.StatusOK, map[string]string{"message": "deleted"})
	}))
	mux.HandleFunc("/api/v1/vocabularies/by-topic", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		topic := r.URL.Query().Get("topic")
		if topic == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing topic (dùng __none__ cho từ không có chủ đề)"})
			return
		}
		n, err := vocabService.DeleteByTopic(r.Context(), getUserID(r.Context()), topic)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"deleted": n, "message": "ok"})
	}))
	mux.HandleFunc("/api/v1/vocabularies/all", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		uid := getUserID(r.Context())
		ctx := r.Context()
		if err := bookmarkService.DeleteAllByUser(ctx, uid); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		_ = reminderService.DeleteByUser(ctx, uid)
		n, err := vocabService.DeleteAll(ctx, uid)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"deleted": n, "message": "ok"})
	}))

	mux.HandleFunc("/api/v1/vocabularies/sync", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		var req struct {
			Rows []models.VocabularyImportRow `json:"rows"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.Rows) == 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload (rows rỗng)"})
			return
		}

		// validate required fields
		filtered := make([]models.VocabularyImportRow, 0, len(req.Rows))
		for _, row := range req.Rows {
			v := strings.TrimSpace(row.Vocabulary)
			m := strings.TrimSpace(row.Meaning)
			if v == "" || m == "" {
				continue
			}
			row.Vocabulary = v
			row.Meaning = m
			// normalize topic
			if strings.TrimSpace(row.Topic) == "" {
				row.Topic = ""
			}
			filtered = append(filtered, row)
		}
		if len(filtered) == 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "không có dòng hợp lệ (cần vocabulary & meaning)"})
			return
		}

		deleted, topics, err := vocabImportService.SyncExcel(r.Context(), getUserID(r.Context()), filtered)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"message": "synced",
			"deleted": deleted,
			"topics":  topics,
		})
	}))

	mux.HandleFunc("/api/v1/bookmarks", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		uid := getUserID(r.Context())
		ctx := r.Context()
		switch r.Method {
		case http.MethodGet:
			if r.URL.Query().Get("idsOnly") == "1" {
				ids, err := bookmarkService.ListVocabIDs(ctx, uid)
				if err != nil {
					writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
					return
				}
				writeJSON(w, http.StatusOK, ids)
				return
			}
			items, err := bookmarkService.ListVocabularies(ctx, uid)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusOK, items)
		case http.MethodPost:
			var req struct {
				VocabularyID string `json:"vocabularyId"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.VocabularyID == "" {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
				return
			}
			if err := bookmarkService.Add(ctx, uid, req.VocabularyID); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusCreated, map[string]string{"message": "saved"})
		case http.MethodDelete:
			vid := r.URL.Query().Get("vocabularyId")
			if vid == "" {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing vocabularyId"})
				return
			}
			if err := bookmarkService.Remove(ctx, uid, vid); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusOK, map[string]string{"message": "removed"})
		default:
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
	}))

	mux.HandleFunc("/api/v1/reminders", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		uid := getUserID(r.Context())
		ctx := r.Context()
		switch r.Method {
		case http.MethodGet:
			item, err := reminderService.Get(ctx, uid)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			if item == nil {
				writeJSON(w, http.StatusOK, nil)
				return
			}
			writeJSON(w, http.StatusOK, item)
		case http.MethodPost:
			var in services.ReminderUpsertInput
			if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
				return
			}
			item, err := reminderService.Upsert(ctx, uid, in)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusOK, item)
		case http.MethodDelete:
			if err := reminderService.DeleteByUser(ctx, uid); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusOK, map[string]string{"message": "deleted"})
		default:
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
	}))

	// Stats + điểm danh
	mux.HandleFunc("/api/v1/stats/me", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		uid := getUserID(r.Context())
		item, err := statsService.GetMe(r.Context(), uid)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, item)
	}))

	mux.HandleFunc("/api/v1/checkin", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		uid := getUserID(r.Context())
		stats, checkin, err := checkInService.CheckIn(r.Context(), uid)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"stats": stats, "checkin": checkin})
	}))

	// Động lực (inactivity reminder)
	mux.HandleFunc("/api/v1/incentive/me", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		uid := getUserID(r.Context())
		switch r.Method {
		case http.MethodGet:
			item, err := inactivityService.GetMe(r.Context(), uid)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusOK, item)
		case http.MethodPost:
			var in services.InactivityUpsertInput
			if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
				return
			}
			item, err := inactivityService.Upsert(r.Context(), uid, in)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusOK, item)
		default:
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
	}))

	// Quiz topic
	mux.HandleFunc("/api/v1/quiz/generate", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		var req services.QuizGenerateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
			return
		}
		uid := getUserID(r.Context())
		resp, err := quizService.Generate(r.Context(), uid, req)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}))

	mux.HandleFunc("/api/v1/quiz/submit", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		var req services.QuizSubmitRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
			return
		}
		uid := getUserID(r.Context())
		resp, err := quizService.Submit(r.Context(), uid, req)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}))

	// Câu cá
	mux.HandleFunc("/api/v1/fishing/start", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		var req services.FishingStartRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
			return
		}
		uid := getUserID(r.Context())
		resp, err := fishingService.Start(r.Context(), uid, req)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}))

	mux.HandleFunc("/api/v1/fishing/submit", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		var req services.FishingSubmitRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
			return
		}
		uid := getUserID(r.Context())
		resp, err := fishingService.Submit(r.Context(), uid, req)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}))

	mux.HandleFunc("/api/v1/fishing/collection", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		uid := getUserID(r.Context())
		resp, err := fishingRepo.GetCollection(r.Context(), uid)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}))

	mux.HandleFunc("/api/v1/fishing/achievements", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		uid := getUserID(r.Context())
		resp, err := fishingRepo.GetAchievements(r.Context(), uid)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}))

	mux.HandleFunc("/api/v1/news", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		userID := getUserID(r.Context())
		switch r.Method {
		case http.MethodGet:
			page, _ := strconv.ParseInt(r.URL.Query().Get("page"), 10, 64)
			limit, _ := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)
			if page <= 0 {
				page = 1
			}
			if limit <= 0 || limit > 50 {
				limit = 10
			}
			posts, err := newsService.ListPosts(r.Context(), page, limit)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusOK, posts)
		case http.MethodPost:
			var post models.NewsPost
			if err := json.NewDecoder(r.Body).Decode(&post); err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
				return
			}
			post.UserID = userID
			if err := newsService.CreatePost(r.Context(), &post); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusCreated, post)
		default:
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
	}))
	mux.HandleFunc("/api/v1/news/like", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		var req struct{ PostID string `json:"postId"` }
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PostID == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
			return
		}
		if err := newsService.LikePost(r.Context(), req.PostID); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"message": "liked"})
	}))
	mux.HandleFunc("/api/v1/news/comment", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		var req struct {
			PostID  string `json:"postId"`
			Content string `json:"content"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
			return
		}
		item := &models.Comment{PostID: req.PostID, UserID: getUserID(r.Context()), Content: req.Content}
		if err := newsService.AddComment(r.Context(), item); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusCreated, item)
	}))
	mux.HandleFunc("/api/v1/news/comments", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		postID := r.URL.Query().Get("postId")
		if postID == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing postId"})
			return
		}
		items, err := newsService.ListCommentsByPost(r.Context(), postID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, items)
	}))
	mux.HandleFunc("/api/v1/news/save-word", withJWT(cfg.JWTSecretKey, authService.IsAccessTokenBlocked, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		var req struct {
			PostID     string `json:"postId"`
			Vocabulary string `json:"vocabulary"`
			Meaning    string `json:"meaning"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
			return
		}
		item := &models.SavedWord{UserID: getUserID(r.Context()), PostID: req.PostID, Vocabulary: req.Vocabulary, Meaning: req.Meaning}
		if err := newsService.SaveWord(r.Context(), item); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		_ = vocabService.Create(r.Context(), &models.Vocabulary{UserID: item.UserID, Vocabulary: item.Vocabulary, POS: "other", Class: "social", Topic: "news", Meaning: item.Meaning})
		writeJSON(w, http.StatusCreated, item)
	}))

	return withCORS(mux)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
