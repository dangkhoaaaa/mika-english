package repositories

import (
	"context"
	"time"

	"mika-english-backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ReminderRepository struct{ col *mongo.Collection }

func NewReminderRepository(db *mongo.Database) *ReminderRepository {
	return &ReminderRepository{col: db.Collection("word_reminders")}
}

func (r *ReminderRepository) GetByUser(ctx context.Context, userID string) (*models.WordReminder, error) {
	var item models.WordReminder
	err := r.col.FindOne(ctx, bson.M{"userId": userID}).Decode(&item)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *ReminderRepository) Save(ctx context.Context, item *models.WordReminder) error {
	now := time.Now()
	item.UpdatedAt = now
	if item.ID.IsZero() {
		item.ID = primitive.NewObjectID()
		item.CreatedAt = now
	}
	filter := bson.M{"userId": item.UserID}
	opts := options.Replace().SetUpsert(true)
	_, err := r.col.ReplaceOne(ctx, filter, item, opts)
	return err
}

func (r *ReminderRepository) DeleteByUser(ctx context.Context, userID string) error {
	_, err := r.col.DeleteOne(ctx, bson.M{"userId": userID})
	return err
}

func (r *ReminderRepository) ListDue(ctx context.Context, before time.Time) ([]models.WordReminder, error) {
	cursor, err := r.col.Find(ctx, bson.M{
		"enabled":   true,
		"nextRunAt": bson.M{"$lte": before},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	out := make([]models.WordReminder, 0)
	for cursor.Next(ctx) {
		var w models.WordReminder
		if err := cursor.Decode(&w); err != nil {
			return nil, err
		}
		out = append(out, w)
	}
	return out, cursor.Err()
}

func (r *ReminderRepository) UpdateAfterSend(ctx context.Context, id primitive.ObjectID, nextRun time.Time, lastSent time.Time) error {
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": bson.M{
		"nextRunAt":  nextRun,
		"lastSentAt": lastSent,
		"updatedAt":  time.Now(),
	}})
	return err
}

// RemoveVocabularyIDs removes deleted vocabulary IDs from reminders.
func (r *ReminderRepository) RemoveVocabularyIDs(ctx context.Context, userID string, vocabularyIDs []string) error {
	if len(vocabularyIDs) == 0 {
		return nil
	}
	_, err := r.col.UpdateMany(ctx, bson.M{"userId": userID}, bson.M{
		"$pull": bson.M{
			"vocabularyIds": bson.M{"$in": vocabularyIDs},
		},
	})
	return err
}
