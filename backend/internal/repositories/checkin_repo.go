package repositories

import (
	"context"
	"time"

	"mika-english-backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type CheckInRepository struct{ col *mongo.Collection }

func NewCheckInRepository(db *mongo.Database) *CheckInRepository {
	return &CheckInRepository{col: db.Collection("daily_checkins")}
}

func (r *CheckInRepository) HasCheckedIn(ctx context.Context, userID, date string) (bool, error) {
	n, err := r.col.CountDocuments(ctx, bson.M{"userId": userID, "date": date})
	return n > 0, err
}

func (r *CheckInRepository) Create(ctx context.Context, item *models.DailyCheckIn) error {
	item.CreatedAt = time.Now().UTC()
	_, err := r.col.InsertOne(ctx, item)
	return err
}

