package repositories

import "go.mongodb.org/mongo-driver/bson/primitive"

func primitiveObjectIDFromHex(id string) (primitive.ObjectID, error) {
	return primitive.ObjectIDFromHex(id)
}
