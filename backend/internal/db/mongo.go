package db

import (
	"context"
	"crypto/tls"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func Connect(ctx context.Context, uri string) (*mongo.Client, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Atlas yêu cầu TLS 1.2+; ép MinVersion để tránh một số trường hợp handshake thất bại.
	opts := options.Client().ApplyURI(uri)
	// Ép TLS 1.2 để tránh một số trường hợp handshake thất bại (đặc biệt trên môi trường mạng/proxy khác nhau).
	// InsecureSkipVerify chỉ để debug; nếu môi trường ổn định thì bỏ lại.
	opts.SetTLSConfig(&tls.Config{
		MinVersion:         tls.VersionTLS12,
		MaxVersion:         tls.VersionTLS12,
		InsecureSkipVerify: false,
	})
	client, err := mongo.Connect(timeoutCtx, opts)
	if err != nil {
		return nil, err
	}
	if err := client.Ping(timeoutCtx, nil); err != nil {
		return nil, err
	}
	return client, nil
}
