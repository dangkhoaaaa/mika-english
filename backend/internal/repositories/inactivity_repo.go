package repositories

import (
	"context"
	"time"

	"mika-english-backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type InactivityReminderRepository struct{ col *mongo.Collection }

func NewInactivityReminderRepository(db *mongo.Database) *InactivityReminderRepository {
	return &InactivityReminderRepository{col: db.Collection("inactivity_reminders")}
}

func (r *InactivityReminderRepository) GetByUser(ctx context.Context, userID string) (*models.InactivityReminder, error) {
	var item models.InactivityReminder
	err := r.col.FindOne(ctx, bson.M{"userId": userID}).Decode(&item)
	if err != nil {
		// user chưa set
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *InactivityReminderRepository) Upsert(ctx context.Context, userID string, notifyEmail string, enabled bool, intervals []int, now time.Time) (*models.InactivityReminder, error) {
	filter := bson.M{"userId": userID}
	opts := options.Replace().SetUpsert(true)

	item := &models.InactivityReminder{
		UserID:            userID,
		NotifyEmail:      notifyEmail,
		Enabled:          enabled,
		IntervalsDays:    intervals,
		LastActiveSeenAt: time.Time{},
		SentIntervals:    []int{},
		UpdatedAt:        now,
	}

	// Nếu đã có record, giữ LastActiveSeenAt/SentIntervals hiện tại.
	existing, err := r.GetByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		item.LastActiveSeenAt = existing.LastActiveSeenAt
		item.SentIntervals = existing.SentIntervals
		item.CreatedAt = existing.CreatedAt
	}
	if item.CreatedAt.IsZero() {
		item.CreatedAt = now
	}

	_, err = r.col.ReplaceOne(ctx, filter, item, opts)
	if err != nil {
		return nil, err
	}
	return r.GetByUser(ctx, userID)
}

func (r *InactivityReminderRepository) ListAllEnabled(ctx context.Context) ([]models.InactivityReminder, error) {
	cursor, err := r.col.Find(ctx, bson.M{"enabled": true})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	out := make([]models.InactivityReminder, 0)
	for cursor.Next(ctx) {
		var item models.InactivityReminder
		if err := cursor.Decode(&item); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, cursor.Err()
}

func (r *InactivityReminderRepository) UpdateState(ctx context.Context, userID string, lastActiveSeenAt time.Time, sent []int, now time.Time) error {
	_, err := r.col.UpdateOne(ctx, bson.M{"userId": userID}, bson.M{
		"$set": bson.M{
			"lastActiveSeenAt": lastActiveSeenAt,
			"sentIntervals":    sent,
			"updatedAt":        now,
		},
	})
	return err
}

