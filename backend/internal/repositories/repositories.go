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

type UserRepository struct{ col *mongo.Collection }
type VocabularyRepository struct{ col *mongo.Collection }
type TokenRepository struct {
	refreshCol   *mongo.Collection
	blacklistCol *mongo.Collection
}
type NewsRepository struct {
	postsCol    *mongo.Collection
	commentsCol *mongo.Collection
	savedCol    *mongo.Collection
}

func NewUserRepository(db *mongo.Database) *UserRepository {
	return &UserRepository{col: db.Collection("users")}
}
func NewVocabularyRepository(db *mongo.Database) *VocabularyRepository {
	return &VocabularyRepository{col: db.Collection("vocabularies")}
}
func NewTokenRepository(db *mongo.Database) *TokenRepository {
	return &TokenRepository{
		refreshCol:   db.Collection("refresh_tokens"),
		blacklistCol: db.Collection("blacklisted_tokens"),
	}
}
func NewNewsRepository(db *mongo.Database) *NewsRepository {
	return &NewsRepository{
		postsCol:    db.Collection("news_posts"),
		commentsCol: db.Collection("news_comments"),
		savedCol:    db.Collection("saved_words"),
	}
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.col.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return &user, err
}

func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	if user.ID.IsZero() {
		user.ID = primitive.NewObjectID()
	}
	user.CreatedAt = time.Now()
	_, err := r.col.InsertOne(ctx, user)
	return err
}

func (r *VocabularyRepository) Create(ctx context.Context, vocab *models.Vocabulary) error {
	if vocab.ID.IsZero() {
		vocab.ID = primitive.NewObjectID()
	}
	now := time.Now()
	vocab.CreatedAt = now
	vocab.UpdatedAt = now
	_, err := r.col.InsertOne(ctx, vocab)
	return err
}

func (r *VocabularyRepository) ListByUser(ctx context.Context, userID string) ([]models.Vocabulary, error) {
	cursor, err := r.col.Find(ctx, bson.M{"userId": userID}, options.Find().SetSort(bson.M{"createdAt": -1}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	items := make([]models.Vocabulary, 0)
	for cursor.Next(ctx) {
		var v models.Vocabulary
		if err := cursor.Decode(&v); err != nil {
			return nil, err
		}
		items = append(items, v)
	}
	return items, cursor.Err()
}

func (r *VocabularyRepository) UpdateByID(ctx context.Context, id, userID string, data bson.M) error {
	data["updatedAt"] = time.Now()
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": toObjectID(id), "userId": userID}, bson.M{"$set": data})
	return err
}

func (r *VocabularyRepository) DeleteByID(ctx context.Context, id, userID string) error {
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": toObjectID(id), "userId": userID})
	return err
}

func (r *VocabularyRepository) DeleteAllByUser(ctx context.Context, userID string) (int64, error) {
	res, err := r.col.DeleteMany(ctx, bson.M{"userId": userID})
	if err != nil {
		return 0, err
	}
	return res.DeletedCount, nil
}

func (r *VocabularyRepository) ListByIDsForUser(ctx context.Context, userID string, ids []string) ([]models.Vocabulary, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	oids := make([]primitive.ObjectID, 0, len(ids))
	for _, id := range ids {
		oid, err := primitiveObjectIDFromHex(id)
		if err != nil {
			continue
		}
		oids = append(oids, oid)
	}
	if len(oids) == 0 {
		return nil, nil
	}
	cursor, err := r.col.Find(ctx, bson.M{"userId": userID, "_id": bson.M{"$in": oids}})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	out := make([]models.Vocabulary, 0)
	for cursor.Next(ctx) {
		var v models.Vocabulary
		if err := cursor.Decode(&v); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, cursor.Err()
}

func (r *VocabularyRepository) DeleteByTopic(ctx context.Context, userID, topic string) (int64, error) {
	var filter bson.M
	if topic == "__none__" {
		filter = bson.M{
			"userId": userID,
			"$or": []bson.M{
				{"topic": ""},
				{"topic": bson.M{"$exists": false}},
			},
		}
	} else {
		filter = bson.M{"userId": userID, "topic": topic}
	}
	res, err := r.col.DeleteMany(ctx, filter)
	if err != nil {
		return 0, err
	}
	return res.DeletedCount, nil
}

func (r *NewsRepository) CreatePost(ctx context.Context, post *models.NewsPost) error {
	post.CreatedAt = time.Now()
	_, err := r.postsCol.InsertOne(ctx, post)
	return err
}

func (r *NewsRepository) ListPosts(ctx context.Context, page, limit int64) ([]models.NewsPost, error) {
	skip := (page - 1) * limit
	opts := options.Find().
		SetSort(bson.D{{Key: "likes", Value: -1}, {Key: "createdAt", Value: -1}}).
		SetSkip(skip).SetLimit(limit)

	cursor, err := r.postsCol.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	posts := make([]models.NewsPost, 0)
	for cursor.Next(ctx) {
		var p models.NewsPost
		if err := cursor.Decode(&p); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}
	return posts, cursor.Err()
}

func (r *NewsRepository) LikePost(ctx context.Context, postID string) error {
	_, err := r.postsCol.UpdateOne(ctx, bson.M{"_id": toObjectID(postID)}, bson.M{"$inc": bson.M{"likes": 1}})
	return err
}

func (r *NewsRepository) AddComment(ctx context.Context, c *models.Comment) error {
	if c.ID.IsZero() {
		c.ID = primitive.NewObjectID()
	}
	c.CreatedAt = time.Now()
	_, err := r.commentsCol.InsertOne(ctx, c)
	return err
}

func (r *NewsRepository) ListCommentsByPost(ctx context.Context, postID string) ([]models.Comment, error) {
	cursor, err := r.commentsCol.Find(ctx, bson.M{"postId": postID}, options.Find().SetSort(bson.M{"createdAt": -1}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	comments := make([]models.Comment, 0)
	for cursor.Next(ctx) {
		var item models.Comment
		if err := cursor.Decode(&item); err != nil {
			return nil, err
		}
		comments = append(comments, item)
	}
	return comments, cursor.Err()
}

func (r *NewsRepository) SaveWord(ctx context.Context, item *models.SavedWord) error {
	item.CreatedAt = time.Now()
	_, err := r.savedCol.InsertOne(ctx, item)
	return err
}

func toObjectID(id string) any {
	oid, err := primitiveObjectIDFromHex(id)
	if err != nil {
		return id
	}
	return oid
}

func (r *TokenRepository) SaveRefreshToken(ctx context.Context, item *models.RefreshToken) error {
	if item.ID.IsZero() {
		item.ID = primitive.NewObjectID()
	}
	item.CreatedAt = time.Now()
	_, err := r.refreshCol.InsertOne(ctx, item)
	return err
}

func (r *TokenRepository) RevokeRefreshToken(ctx context.Context, tokenID string) error {
	_, err := r.refreshCol.UpdateOne(ctx, bson.M{"tokenId": tokenID}, bson.M{"$set": bson.M{"revoked": true}})
	return err
}

func (r *TokenRepository) FindRefreshToken(ctx context.Context, tokenID string) (*models.RefreshToken, error) {
	var item models.RefreshToken
	err := r.refreshCol.FindOne(ctx, bson.M{"tokenId": tokenID}).Decode(&item)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return &item, err
}

func (r *TokenRepository) BlacklistAccessToken(ctx context.Context, item *models.BlacklistedToken) error {
	if item.ID.IsZero() {
		item.ID = primitive.NewObjectID()
	}
	item.CreatedAt = time.Now()
	_, err := r.blacklistCol.InsertOne(ctx, item)
	return err
}

func (r *TokenRepository) IsAccessTokenBlacklisted(ctx context.Context, tokenID string) (bool, error) {
	count, err := r.blacklistCol.CountDocuments(ctx, bson.M{"tokenId": tokenID})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
