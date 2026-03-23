// Run: mongosh "<MONGO_URI>/<DB_NAME>" --file backend/scripts/mongo-indexes.js

db.users.createIndex({ email: 1 }, { unique: true, name: "uq_email" });
db.vocabularies.createIndex({ userId: 1, createdAt: -1 }, { name: "idx_vocab_user_created" });
db.vocabularies.createIndex({ userId: 1, topic: 1 }, { name: "idx_vocab_user_topic" });
db.news_posts.createIndex({ likes: -1, createdAt: -1 }, { name: "idx_news_ranking" });
db.news_posts.createIndex({ userId: 1 }, { name: "idx_news_user" });
db.news_comments.createIndex({ postId: 1, createdAt: -1 }, { name: "idx_comments_post_created" });
db.refresh_tokens.createIndex({ tokenId: 1 }, { unique: true, name: "uq_refresh_token_id" });
db.refresh_tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "ttl_refresh_expires" });
db.blacklisted_tokens.createIndex({ tokenId: 1 }, { unique: true, name: "uq_blacklist_token_id" });
db.blacklisted_tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "ttl_blacklist_expires" });
