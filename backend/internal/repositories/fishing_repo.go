package repositories

import (
	"context"
	"sort"
	"time"

	"mika-english-backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type FishingRepository struct {
	attemptCol *mongo.Collection
	catchCol   *mongo.Collection
}

func NewFishingRepository(db *mongo.Database) *FishingRepository {
	return &FishingRepository{
		attemptCol: db.Collection("fishing_attempts"),
		catchCol:   db.Collection("fishing_catches"),
	}
}

func (r *FishingRepository) CreateAttempt(ctx context.Context, item *models.FishingAttempt) (string, error) {
	now := time.Now().UTC()
	if item.ID.IsZero() {
		item.ID = primitive.NewObjectID()
	}
	item.CreatedAt = now
	item.UpdatedAt = now
	_, err := r.attemptCol.InsertOne(ctx, item)
	return item.ID.Hex(), err
}

func (r *FishingRepository) GetAttempt(ctx context.Context, userID, attemptID string) (*models.FishingAttempt, error) {
	oid, err := primitive.ObjectIDFromHex(attemptID)
	if err != nil {
		return nil, err
	}
	var item models.FishingAttempt
	err = r.attemptCol.FindOne(ctx, bson.M{"_id": oid, "userId": userID}).Decode(&item)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *FishingRepository) MarkAttemptCompleted(ctx context.Context, userID, attemptID string) error {
	oid, err := primitive.ObjectIDFromHex(attemptID)
	if err != nil {
		return err
	}
	_, err = r.attemptCol.UpdateOne(ctx, bson.M{"_id": oid, "userId": userID}, bson.M{
		"$set": bson.M{"status": "completed", "updatedAt": time.Now().UTC()},
	})
	return err
}

func (r *FishingRepository) CreateCatch(ctx context.Context, item *models.FishCatch) error {
	now := time.Now().UTC()
	if item.ID.IsZero() {
		item.ID = primitive.NewObjectID()
	}
	item.CreatedAt = now
	if item.CaughtAt.IsZero() {
		item.CaughtAt = now
	}
	_, err := r.catchCol.InsertOne(ctx, item)
	return err
}

type FishingAchievements struct {
	TotalUnique int            `json:"totalUnique"`
	TotalCatches int          `json:"totalCatches"`
	CountsByType map[string]int `json:"countsByType"`
	LastCaughtAt *time.Time    `json:"lastCaughtAt,omitempty"`
}

func (r *FishingRepository) GetAchievements(ctx context.Context, userID string) (*FishingAchievements, error) {
	cursor, err := r.catchCol.Find(ctx, bson.M{"userId": userID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	counts := map[string]int{}
	unique := map[string]struct{}{}
	var last *time.Time

	for cursor.Next(ctx) {
		var c models.FishCatch
		if err := cursor.Decode(&c); err != nil {
			return nil, err
		}
		counts[c.FishType] = counts[c.FishType] + 1
		unique[c.VocabularyID] = struct{}{}
		if last == nil || c.CaughtAt.After(*last) {
			t := c.CaughtAt
			last = &t
		}
	}
	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return &FishingAchievements{
		TotalUnique: uniqueCount(unique),
		TotalCatches: totalCountFromMap(counts),
		CountsByType: counts,
		LastCaughtAt: last,
	}, nil
}

func uniqueCount(m map[string]struct{}) int { return len(m) }
func totalCountFromMap(m map[string]int) int {
	n := 0
	for _, v := range m {
		n += v
	}
	return n
}

// Collection returns best fish type per vocabularyId (highest rarity) and count of catches.
type FishingCollectionItem struct {
	VocabularyID string    `json:"vocabularyId"`
	VocabularyValue string `json:"vocabularyValue"`
	VocabularyMeaning string `json:"vocabularyMeaning"`
	Topic string            `json:"topic"`

	BestFishType string `json:"bestFishType"`
	BestOrder int        `json:"bestOrder"`
	CatchCount int      `json:"catchCount"`
}

type fishingCollectionResponse struct {
	Items []FishingCollectionItem `json:"items"`
	TotalUnique int               `json:"totalUnique"`
	CountsByType map[string]int  `json:"countsByType"`
}

func (r *FishingRepository) GetCollection(ctx context.Context, userID string) (fishingCollectionResponse, error) {
	cursor, err := r.catchCol.Find(ctx, bson.M{"userId": userID})
	if err != nil {
		return fishingCollectionResponse{}, err
	}
	defer cursor.Close(ctx)

	orderMap := fishOrderMap()
	byVocab := map[string]FishingCollectionItem{}
	counts := map[string]int{}

	for cursor.Next(ctx) {
		var c models.FishCatch
		if err := cursor.Decode(&c); err != nil {
			return fishingCollectionResponse{}, err
		}
		counts[c.FishType] = counts[c.FishType] + 1
		order := orderMap[c.FishType]
		item, ok := byVocab[c.VocabularyID]
		if !ok {
			byVocab[c.VocabularyID] = FishingCollectionItem{
				VocabularyID: c.VocabularyID,
				VocabularyValue: c.VocabularyValue,
				VocabularyMeaning: c.VocabularyMeaning,
				Topic: c.Topic,
				BestFishType: c.FishType,
				BestOrder: order,
				CatchCount: 1,
			}
			continue
		}
		// update count
		item.CatchCount++
		// update best type if higher rarity
		if order > item.BestOrder {
			item.BestOrder = order
			item.BestFishType = c.FishType
		}
		byVocab[c.VocabularyID] = item
	}
	if err := cursor.Err(); err != nil {
		return fishingCollectionResponse{}, err
	}

	items := make([]FishingCollectionItem, 0, len(byVocab))
	for _, it := range byVocab {
		items = append(items, it)
	}
	// sort by bestOrder desc
	sortCollectionItems(items)

	return fishingCollectionResponse{
		Items: items,
		TotalUnique: len(byVocab),
		CountsByType: counts,
	}, nil
}

func fishOrderMap() map[string]int {
	return map[string]int{
		"D":  0,
		"C":  1,
		"B":  2,
		"A":  3,
		"S":  4,
		"SS": 5,
		"SSS": 6,
	}
}

func sortCollectionItems(items []FishingCollectionItem) {
	sort.Slice(items, func(i, j int) bool {
		if items[i].BestOrder == items[j].BestOrder {
			return items[i].CatchCount > items[j].CatchCount
		}
		return items[i].BestOrder > items[j].BestOrder
	})
}

type FishingTopUser struct {
	UserID      string `json:"userId"`
	TotalCatches int   `json:"totalCatches"`
	TotalUnique int    `json:"totalUnique"`
}

func (r *FishingRepository) TopUsersByFishCount(ctx context.Context, limit int) ([]FishingTopUser, error) {
	if limit <= 0 {
		limit = 50
	}
	cursor, err := r.catchCol.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	type agg struct {
		total int
		uniq  map[string]struct{}
	}
	byUser := map[string]*agg{}

	for cursor.Next(ctx) {
		var c models.FishCatch
		if err := cursor.Decode(&c); err != nil {
			return nil, err
		}
		a, ok := byUser[c.UserID]
		if !ok {
			a = &agg{uniq: map[string]struct{}{}}
			byUser[c.UserID] = a
		}
		a.total++
		a.uniq[c.VocabularyID] = struct{}{}
	}
	if err := cursor.Err(); err != nil {
		return nil, err
	}

	out := make([]FishingTopUser, 0, len(byUser))
	for uid, a := range byUser {
		out = append(out, FishingTopUser{
			UserID:      uid,
			TotalCatches: a.total,
			TotalUnique: len(a.uniq),
		})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].TotalCatches == out[j].TotalCatches {
			return out[i].TotalUnique > out[j].TotalUnique
		}
		return out[i].TotalCatches > out[j].TotalCatches
	})
	if len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

