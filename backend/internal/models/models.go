package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func NewTokenID() string {
	return primitive.NewObjectID().Hex()
}

type Vocabulary struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Vocabulary string    `bson:"vocabulary" json:"vocabulary"`
	POS        string    `bson:"pos" json:"pos"`
	Class      string    `bson:"class" json:"class"`
	Topic      string    `bson:"topic" json:"topic"` // chủ đề (vd: tên sheet Excel)
	Meaning    string    `bson:"meaning" json:"meaning"`
	Example    string    `bson:"example" json:"example"`
	UserID     string    `bson:"userId" json:"userId"`
	CreatedAt  time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt  time.Time `bson:"updatedAt" json:"updatedAt"`
}

// VocabularyImportRow — row chuẩn hóa từ Excel (mỗi sheet = một topic).
// Khi sync lại theo sheet/topic, backend sẽ coi dữ liệu là "authoritative" đúng theo bộ rows này.
type VocabularyImportRow struct {
	Vocabulary string `json:"vocabulary"`
	POS        string `json:"pos"`
	Class      string `json:"class"`
	Topic      string `json:"topic"`
	Meaning    string `json:"meaning"`
	Example    string `json:"example"`
}

type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Email        string    `bson:"email" json:"email"`
	PasswordHash string    `bson:"passwordHash,omitempty" json:"-"`
	DisplayName  string    `bson:"displayName" json:"displayName"`
	AvatarURL    string    `bson:"avatarUrl,omitempty" json:"avatarUrl,omitempty"`
	Provider     string    `bson:"provider" json:"provider"`
	CreatedAt    time.Time `bson:"createdAt" json:"createdAt"`
}

type NewsPost struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    string    `bson:"userId" json:"userId"`
	Content   string    `bson:"content" json:"content"`
	Likes     int64     `bson:"likes" json:"likes"`
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
}

type Comment struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PostID    string             `bson:"postId" json:"postId"`
	UserID    string             `bson:"userId" json:"userId"`
	Content   string             `bson:"content" json:"content"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

type SavedWord struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID     string             `bson:"userId" json:"userId"`
	PostID     string             `bson:"postId" json:"postId"`
	Vocabulary string             `bson:"vocabulary" json:"vocabulary"`
	Meaning    string             `bson:"meaning" json:"meaning"`
	CreatedAt  time.Time          `bson:"createdAt" json:"createdAt"`
}

type RefreshToken struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    string             `bson:"userId" json:"userId"`
	TokenID   string             `bson:"tokenId" json:"tokenId"`
	ExpiresAt time.Time          `bson:"expiresAt" json:"expiresAt"`
	Revoked   bool               `bson:"revoked" json:"revoked"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

type BlacklistedToken struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	TokenID   string             `bson:"tokenId" json:"tokenId"`
	ExpiresAt time.Time          `bson:"expiresAt" json:"expiresAt"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

// VocabBookmark — từ đã lưu (từ khó học), tham chiếu tới vocabularies.
type VocabBookmark struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID        string             `bson:"userId" json:"userId"`
	VocabularyID  string             `bson:"vocabularyId" json:"vocabularyId"`
	CreatedAt     time.Time          `bson:"createdAt" json:"createdAt"`
}

// WordReminder — nhắc từ qua email (một bản ghi / user).
type WordReminder struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID         string             `bson:"userId" json:"userId"`
	NotifyEmail    string             `bson:"notifyEmail" json:"notifyEmail"`
	Schedule       string             `bson:"schedule" json:"schedule"` // hourly | daily | weekly
	Hour           int                `bson:"hour" json:"hour"`
	Minute         int                `bson:"minute" json:"minute"`
	Weekday        int                `bson:"weekday" json:"weekday"` // 0=Chủ nhật … 6=Thứ bảy (time.Weekday)
	VocabularyIDs  []string           `bson:"vocabularyIds" json:"vocabularyIds"`
	Enabled        bool               `bson:"enabled" json:"enabled"`
	NextRunAt      time.Time          `bson:"nextRunAt" json:"nextRunAt"`
	LastSentAt     *time.Time         `bson:"lastSentAt,omitempty" json:"lastSentAt,omitempty"`
	CreatedAt      time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt      time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// UserStats lưu điểm/rank/streak của người dùng.
type UserStats struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID          string             `bson:"userId" json:"userId"`
	Points          int                `bson:"points" json:"points"`
	Rank            string             `bson:"rank" json:"rank"`
	StreakDays      int                `bson:"streakDays" json:"streakDays"`
	LastCheckInDate string            `bson:"lastCheckInDate" json:"lastCheckInDate"` // YYYY-MM-DD
	LastActiveAt    time.Time        `bson:"lastActiveAt" json:"lastActiveAt"`
	CreatedAt       time.Time        `bson:"createdAt" json:"createdAt"`
	UpdatedAt       time.Time        `bson:"updatedAt" json:"updatedAt"`
}

// DailyCheckIn record mỗi ngày người dùng điểm danh (nhận điểm).
type DailyCheckIn struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    string             `bson:"userId" json:"userId"`
	Date      string             `bson:"date" json:"date"` // YYYY-MM-DD
	Points    int                `bson:"points" json:"points"`
	StreakDays int               `bson:"streakDays" json:"streakDays"`
	CreatedAt time.Time         `bson:"createdAt" json:"createdAt"`
}

type QuizQuestion struct {
	QuestionVocabularyID string   `bson:"questionVocabularyId" json:"questionVocabularyId"`
	CorrectVocabularyID  string   `bson:"correctVocabularyId" json:"correctVocabularyId"`
	OptionVocabularyIDs  []string `bson:"optionVocabularyIds" json:"optionVocabularyIds"`
}

// QuizSession chứa bộ câu hỏi và kết quả để chấm điểm.
type QuizSession struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID      string             `bson:"userId" json:"userId"`
	Topic       string             `bson:"topic" json:"topic"`
	Total       int                `bson:"total" json:"total"`
	Score       int                `bson:"score" json:"score"`
	Completed   bool               `bson:"completed" json:"completed"`
	Questions   []QuizQuestion    `bson:"questions" json:"questions"`
	CreatedAt   time.Time         `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time         `bson:"updatedAt" json:"updatedAt"`
}

// InactivityReminder — nhắc mail khi người dùng không hoạt động học trong X ngày.
type InactivityReminder struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID          string             `bson:"userId" json:"userId"`
	NotifyEmail     string             `bson:"notifyEmail" json:"notifyEmail"`
	Enabled         bool               `bson:"enabled" json:"enabled"`
	IntervalsDays   []int             `bson:"intervalsDays" json:"intervalsDays"`     // ví dụ [7,30]
	LastActiveSeenAt time.Time        `bson:"lastActiveSeenAt" json:"lastActiveSeenAt"` // để reset khi user hoạt động lại
	SentIntervals   []int             `bson:"sentIntervals" json:"sentIntervals"`     // đã gửi cho các interval nào
	CreatedAt       time.Time         `bson:"createdAt" json:"createdAt"`
	UpdatedAt       time.Time         `bson:"updatedAt" json:"updatedAt"`
}

// Fishing attempt: server creates a fishing scenario and client tries to "catch".
type FishingAttempt struct {
	ID primitive.ObjectID `bson:"_id,omitempty" json:"id"`

	UserID   string `bson:"userId" json:"userId"`
	Topic    string `bson:"topic" json:"topic"`

	FishType   string `bson:"fishType" json:"fishType"` // D/C/B/A/S/SS/SSS
	VocabularyID string `bson:"vocabularyId" json:"vocabularyId"`
	VocabularyValue string `bson:"vocabularyValue" json:"vocabularyValue"`
	VocabularyMeaning string `bson:"vocabularyMeaning" json:"vocabularyMeaning"`

	// Timing mechanic: client clicks when indicator is within [targetStartMs, targetEndMs]
	MechanicDurationMs int `bson:"mechanicDurationMs" json:"mechanicDurationMs"`
	TargetStartMs      int `bson:"targetStartMs" json:"targetStartMs"`
	TargetEndMs        int `bson:"targetEndMs" json:"targetEndMs"`

	Status   string    `bson:"status" json:"status"` // created | completed
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

// FishCatch is saved when user answers correctly after successful timing.
type FishCatch struct {
	ID primitive.ObjectID `bson:"_id,omitempty" json:"id"`

	UserID    string    `bson:"userId" json:"userId"`
	AttemptID string    `bson:"attemptId" json:"attemptId"`
	Topic     string    `bson:"topic" json:"topic"`

	FishType string `bson:"fishType" json:"fishType"`

	VocabularyID string `bson:"vocabularyId" json:"vocabularyId"`
	VocabularyValue string `bson:"vocabularyValue" json:"vocabularyValue"`
	VocabularyMeaning string `bson:"vocabularyMeaning" json:"vocabularyMeaning"`

	CaughtAt time.Time `bson:"caughtAt" json:"caughtAt"`
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
}
