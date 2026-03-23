package db

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func EnsureIndexes(ctx context.Context, database *mongo.Database) error {
	timeoutCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	_, err := database.Collection("users").Indexes().CreateMany(timeoutCtx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "email", Value: 1}}, Options: options.Index().SetUnique(true).SetName("uq_email")},
	})
	if err != nil {
		return err
	}

	_, err = database.Collection("vocabularies").Indexes().CreateMany(timeoutCtx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "createdAt", Value: -1}}, Options: options.Index().SetName("idx_vocab_user_created")},
		{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "topic", Value: 1}}, Options: options.Index().SetName("idx_vocab_user_topic")},
		{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "topic", Value: 1}, {Key: "vocabulary", Value: 1}, {Key: "meaning", Value: 1}}, Options: options.Index().SetName("idx_vocab_user_topic_vocab_meaning")},
	})
	if err != nil {
		return err
	}

	_, err = database.Collection("news_posts").Indexes().CreateMany(timeoutCtx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "likes", Value: -1}, {Key: "createdAt", Value: -1}}, Options: options.Index().SetName("idx_news_ranking")},
		{Keys: bson.D{{Key: "userId", Value: 1}}, Options: options.Index().SetName("idx_news_user")},
	})
	if err != nil {
		return err
	}

	_, err = database.Collection("news_comments").Indexes().CreateMany(timeoutCtx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "postId", Value: 1}, {Key: "createdAt", Value: -1}}, Options: options.Index().SetName("idx_comments_post_created")},
	})
	if err != nil {
		return err
	}

	_, err = database.Collection("refresh_tokens").Indexes().CreateMany(timeoutCtx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "tokenId", Value: 1}}, Options: options.Index().SetUnique(true).SetName("uq_refresh_token_id")},
		{Keys: bson.D{{Key: "expiresAt", Value: 1}}, Options: options.Index().SetExpireAfterSeconds(0).SetName("ttl_refresh_expires")},
	})
	if err != nil {
		return err
	}

	_, err = database.Collection("blacklisted_tokens").Indexes().CreateMany(timeoutCtx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "tokenId", Value: 1}}, Options: options.Index().SetUnique(true).SetName("uq_blacklist_token_id")},
		{Keys: bson.D{{Key: "expiresAt", Value: 1}}, Options: options.Index().SetExpireAfterSeconds(0).SetName("ttl_blacklist_expires")},
	})
	if err != nil {
		return err
	}

	_, err = database.Collection("vocab_bookmarks").Indexes().CreateMany(timeoutCtx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "vocabularyId", Value: 1}}, Options: options.Index().SetUnique(true).SetName("uq_bookmark_user_vocab")},
		{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "createdAt", Value: -1}}, Options: options.Index().SetName("idx_bookmark_user_created")},
	})
	if err != nil {
		return err
	}

	_, err = database.Collection("word_reminders").Indexes().CreateMany(timeoutCtx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "userId", Value: 1}}, Options: options.Index().SetUnique(true).SetName("uq_reminder_user")},
		{Keys: bson.D{{Key: "nextRunAt", Value: 1}, {Key: "enabled", Value: 1}}, Options: options.Index().SetName("idx_reminder_due")},
	})

	if err != nil {
		return err
	}

	_, err = database.Collection("user_stats").Indexes().CreateMany(timeoutCtx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "userId", Value: 1}}, Options: options.Index().SetUnique(true).SetName("uq_user_stats_userId")},
	})
	if err != nil {
		return err
	}

	_, err = database.Collection("daily_checkins").Indexes().CreateMany(timeoutCtx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "date", Value: 1}}, Options: options.Index().SetUnique(true).SetName("uq_checkins_user_date")},
		{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "date", Value: -1}}, Options: options.Index().SetName("idx_checkins_user_date")},
	})
	if err != nil {
		return err
	}

	_, err = database.Collection("quiz_sessions").Indexes().CreateMany(timeoutCtx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "completed", Value: 1}}, Options: options.Index().SetName("idx_quiz_user_completed")},
	})

	if err != nil {
		return err
	}

	_, err = database.Collection("inactivity_reminders").Indexes().CreateMany(timeoutCtx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "userId", Value: 1}}, Options: options.Index().SetUnique(true).SetName("uq_inactivity_userId")},
	})
	if err != nil {
		return err
	}

	_, err = database.Collection("fishing_attempts").Indexes().CreateMany(timeoutCtx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "status", Value: 1}}, Options: options.Index().SetName("idx_fishing_user_status")},
	})
	if err != nil {
		return err
	}

	_, err = database.Collection("fishing_catches").Indexes().CreateMany(timeoutCtx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "caughtAt", Value: -1}}, Options: options.Index().SetName("idx_fishing_user_caught_desc")},
	})
	if err != nil {
		return err
	}

	return err
}
