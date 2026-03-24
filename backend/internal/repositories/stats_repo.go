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

type StatsRepository struct{ col *mongo.Collection }

func NewStatsRepository(db *mongo.Database) *StatsRepository {
	return &StatsRepository{col: db.Collection("user_stats")}
}

func (r *StatsRepository) GetByUser(ctx context.Context, userID string) (*models.UserStats, error) {
	var s models.UserStats
	err := r.col.FindOne(ctx, bson.M{"userId": userID}).Decode(&s)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *StatsRepository) Upsert(ctx context.Context, userID string, pointsDelta int, streakDelta *int, nextCheckInDate string, now time.Time, rank string) (*models.UserStats, error) {
	// We'll update points and optional streak/check-in.
	update := bson.M{
		"$set": bson.M{
			"updatedAt": now,
			"rank":      rank,
		},
		"$inc": bson.M{
			"points": pointsDelta,
		},
	}

	if streakDelta != nil {
		update["$set"] = bson.M{
			"updatedAt":        now,
			"rank":             rank,
			"streakDays":       *streakDelta,
			"lastCheckInDate":  nextCheckInDate,
		}
	}

	opts := options.Update().SetUpsert(true)
	if err := ensureObjectIDForUpsert(update, userID); err != nil {
		return nil, err
	}

	_, err := r.col.UpdateOne(ctx, bson.M{"userId": userID}, update, opts)
	if err != nil {
		return nil, err
	}
	return r.GetByUser(ctx, userID)
}

func ensureObjectIDForUpsert(_ bson.M, _ string) error {
	// placeholder: Upsert doesn't require explicit _id in this app.
	return nil
}

func (r *StatsRepository) SetCheckInState(ctx context.Context, userID string, pointsDelta int, streakDays int, date string, rank string, now time.Time) (*models.UserStats, error) {
	update := bson.M{
		"$set": bson.M{
			"streakDays":       streakDays,
			"lastCheckInDate":  date,
			"rank":             rank,
			"updatedAt":       now,
		},
		"$inc": bson.M{
			"points": pointsDelta,
		},
	}
	opts := options.Update().SetUpsert(true)
	_, err := r.col.UpdateOne(ctx, bson.M{"userId": userID}, update, opts)
	if err != nil {
		return nil, err
	}
	return r.GetByUser(ctx, userID)
}

func (r *StatsRepository) UpdateLastActive(ctx context.Context, userID string, last time.Time) error {
	_, err := r.col.UpdateOne(ctx, bson.M{"userId": userID}, bson.M{"$set": bson.M{"lastActiveAt": last, "updatedAt": time.Now().UTC()}})
	if err != nil {
		return err
	}
	return nil
}

func (r *StatsRepository) EnsureBase(ctx context.Context, userID string, now time.Time) error {
	_, err := r.col.UpdateOne(ctx, bson.M{"userId": userID}, bson.M{
		"$setOnInsert": bson.M{
			"userId":         userID,
			"points":         0,
			"rank":           "Đồng",
			"streakDays":     0,
			"lastCheckInDate": "",
			"lastActiveAt":   now,
			"createdAt":      now,
			"updatedAt":      now,
		},
	}, options.Update().SetUpsert(true))
	return err
}

// Use this helper for any place where we need created object id.
func newObjectID() primitive.ObjectID { return primitive.NewObjectID() }

func (r *StatsRepository) TopByPoints(ctx context.Context, limit int64) ([]models.UserStats, error) {
	if limit <= 0 {
		limit = 50
	}
	cursor, err := r.col.Find(ctx, bson.M{}, options.Find().SetSort(bson.D{
		{Key: "points", Value: -1},
		{Key: "updatedAt", Value: 1},
	}).SetLimit(limit))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	out := make([]models.UserStats, 0)
	for cursor.Next(ctx) {
		var s models.UserStats
		if err := cursor.Decode(&s); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, cursor.Err()
}

