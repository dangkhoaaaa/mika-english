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

type BookmarkRepository struct{ col *mongo.Collection }

func NewBookmarkRepository(db *mongo.Database) *BookmarkRepository {
	return &BookmarkRepository{col: db.Collection("vocab_bookmarks")}
}

func (r *BookmarkRepository) Add(ctx context.Context, userID, vocabularyID string) error {
	var existing models.VocabBookmark
	err := r.col.FindOne(ctx, bson.M{"userId": userID, "vocabularyId": vocabularyID}).Decode(&existing)
	if err == nil {
		return nil // đã có
	}
	if err != mongo.ErrNoDocuments {
		return err
	}
	b := &models.VocabBookmark{
		ID:           primitive.NewObjectID(),
		UserID:       userID,
		VocabularyID: vocabularyID,
		CreatedAt:    time.Now(),
	}
	_, err = r.col.InsertOne(ctx, b)
	return err
}

func (r *BookmarkRepository) Remove(ctx context.Context, userID, vocabularyID string) error {
	_, err := r.col.DeleteOne(ctx, bson.M{"userId": userID, "vocabularyId": vocabularyID})
	return err
}

func (r *BookmarkRepository) ListVocabIDs(ctx context.Context, userID string) ([]string, error) {
	cursor, err := r.col.Find(ctx, bson.M{"userId": userID}, options.Find().SetSort(bson.M{"createdAt": -1}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	out := make([]string, 0)
	for cursor.Next(ctx) {
		var b models.VocabBookmark
		if err := cursor.Decode(&b); err != nil {
			return nil, err
		}
		out = append(out, b.VocabularyID)
	}
	return out, cursor.Err()
}

func (r *BookmarkRepository) IsBookmarked(ctx context.Context, userID, vocabularyID string) (bool, error) {
	n, err := r.col.CountDocuments(ctx, bson.M{"userId": userID, "vocabularyId": vocabularyID})
	return n > 0, err
}

func (r *BookmarkRepository) DeleteAllByUser(ctx context.Context, userID string) error {
	_, err := r.col.DeleteMany(ctx, bson.M{"userId": userID})
	return err
}

func (r *BookmarkRepository) DeleteByVocabularyIDs(ctx context.Context, userID string, vocabularyIDs []string) error {
	if len(vocabularyIDs) == 0 {
		return nil
	}
	_, err := r.col.DeleteMany(ctx, bson.M{
		"userId":       userID,
		"vocabularyId": bson.M{"$in": vocabularyIDs},
	})
	return err
}
