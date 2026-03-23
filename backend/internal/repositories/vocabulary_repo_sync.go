package repositories

import (
	"context"
	"strings"
	"time"
	"unicode"

	"mika-english-backend/internal/models"

	"golang.org/x/text/unicode/norm"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SyncByTopic sync vocabularies for one topic, using incoming rows as authoritative data.
// It deletes documents that are not present in the incoming set, and upserts those that exist.
// Returns deleted vocabulary IDs (hex) so caller can cleanup bookmarks/reminders.
func (r *VocabularyRepository) SyncByTopic(
	ctx context.Context,
	userID string,
	topic string,
	rows []models.VocabularyImportRow,
) ([]string, error) {
	now := time.Now().UTC()

	// desired map: key => row
	desired := make(map[string]models.VocabularyImportRow, len(rows))
	for _, row := range rows {
		desired[keyOf(topic, row.Vocabulary, row.Meaning)] = row
	}

	// load existing docs for this topic
	cursor, err := r.col.Find(ctx, bson.M{"userId": userID, "topic": topic})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	existingByKey := make(map[string]models.Vocabulary, 128)
	existingKeys := make(map[string]struct{})
	for cursor.Next(ctx) {
		var v models.Vocabulary
		if err := cursor.Decode(&v); err != nil {
			return nil, err
		}
		k := keyOf(topic, v.Vocabulary, v.Meaning)
		existingByKey[k] = v
		existingKeys[k] = struct{}{}
	}
	if err := cursor.Err(); err != nil {
		return nil, err
	}

	// upsert updates + inserts
	for k, row := range desired {
		if v, ok := existingByKey[k]; ok {
			_, err := r.col.UpdateOne(
				ctx,
				bson.M{"_id": v.ID, "userId": userID},
				bson.M{"$set": bson.M{
					"vocabulary": row.Vocabulary,
					"pos":        row.POS,
					"class":      row.Class,
					"topic":      row.Topic,
					"meaning":    row.Meaning,
					"example":    row.Example,
					"updatedAt":  now,
				}},
			)
			if err != nil {
				return nil, err
			}
		} else {
			item := models.Vocabulary{
				ID:         primitive.NewObjectID(),
				Vocabulary: row.Vocabulary,
				POS:        row.POS,
				Class:      row.Class,
				Topic:      row.Topic,
				Meaning:    row.Meaning,
				Example:    row.Example,
				UserID:     userID,
				CreatedAt:  now,
				UpdatedAt:  now,
			}
			_, err := r.col.InsertOne(ctx, item)
			if err != nil {
				return nil, err
			}
		}
	}

	// delete existing docs that are not in desired set
	toDeleteIDs := make([]primitive.ObjectID, 0)
	deletedHex := make([]string, 0)
	for k := range existingKeys {
		if _, ok := desired[k]; ok {
			continue
		}
		v := existingByKey[k]
		toDeleteIDs = append(toDeleteIDs, v.ID)
		deletedHex = append(deletedHex, v.ID.Hex())
	}

	if len(toDeleteIDs) > 0 {
		_, err := r.col.DeleteMany(ctx, bson.M{"_id": bson.M{"$in": toDeleteIDs}, "userId": userID})
		if err != nil {
			return nil, err
		}
	}

	return deletedHex, nil
}

func foldKey(s string) string {
	s = strings.ReplaceAll(s, "\u00a0", " ")
	s = strings.TrimSpace(s)
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, "đ", "d")
	s = strings.ReplaceAll(s, "Đ", "d")
	s = norm.NFD.String(s)

	out := strings.Builder{}
	out.Grow(len(s))
	for _, r := range s {
		if unicode.Is(unicode.Mn, r) {
			continue
		}
		out.WriteRune(r)
	}
	s = out.String()

	return strings.Join(strings.Fields(s), " ")
}

func keyOf(topic, vocabulary, meaning string) string {
	return foldKey(topic) + "|" + foldKey(vocabulary) + "|" + foldKey(meaning)
}

