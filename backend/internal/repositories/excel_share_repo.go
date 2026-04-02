package repositories

import (
	"context"
	"time"

	"mika-english-backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ExcelShareRepository struct {
	col *mongo.Collection
}

func NewExcelShareRepository(db *mongo.Database) *ExcelShareRepository {
	return &ExcelShareRepository{col: db.Collection("excel_library")}
}

func (r *ExcelShareRepository) Create(ctx context.Context, item *models.ExcelShareItem) error {
	item.CreatedAt = time.Now().UTC()
	_, err := r.col.InsertOne(ctx, item)
	return err
}

func (r *ExcelShareRepository) ListPaged(ctx context.Context, page, limit int64) ([]models.ExcelShareItem, int64, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	filter := bson.M{}
	total, err := r.col.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}
	skip := (page - 1) * limit
	opts := options.Find().
		SetSort(bson.M{"createdAt": -1}).
		SetSkip(skip).
		SetLimit(limit)
	cur, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)
	out := make([]models.ExcelShareItem, 0)
	for cur.Next(ctx) {
		var it models.ExcelShareItem
		if err := cur.Decode(&it); err != nil {
			return nil, 0, err
		}
		out = append(out, it)
	}
	return out, total, cur.Err()
}

