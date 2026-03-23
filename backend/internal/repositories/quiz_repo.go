package repositories

import (
	"context"
	"time"

	"mika-english-backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type QuizRepository struct{ col *mongo.Collection }

func NewQuizRepository(db *mongo.Database) *QuizRepository {
	return &QuizRepository{col: db.Collection("quiz_sessions")}
}

func (r *QuizRepository) Create(ctx context.Context, item *models.QuizSession) (primitive.ObjectID, error) {
	item.CreatedAt = time.Now().UTC()
	item.UpdatedAt = item.CreatedAt
	res, err := r.col.InsertOne(ctx, item)
	if err != nil {
		return primitive.NilObjectID, err
	}
	oid, _ := res.InsertedID.(primitive.ObjectID)
	return oid, nil
}

func (r *QuizRepository) GetByID(ctx context.Context, id string) (*models.QuizSession, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var s models.QuizSession
	if err := r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&s); err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *QuizRepository) MarkCompletedAndScore(ctx context.Context, id string, score int) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{
		"$set": bson.M{
			"completed": true,
			"score":     score,
			"updatedAt": time.Now().UTC(),
		},
	})
	return err
}

