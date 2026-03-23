package services

import (
	"context"
	"errors"
	"time"

	"mika-english-backend/internal/models"
	"mika-english-backend/internal/repositories"
	"mika-english-backend/internal/security"

	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	repo             *repositories.UserRepository
	tokenRepo        *repositories.TokenRepository
	jwtSecret        string
	googleClientID   string
	accessTokenTTL   time.Duration
	refreshTokenTTL  time.Duration
}

type TokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

func NewAuthService(repo *repositories.UserRepository, tokenRepo *repositories.TokenRepository, jwtSecret, googleClientID string) *AuthService {
	return &AuthService{
		repo:            repo,
		tokenRepo:       tokenRepo,
		jwtSecret:       jwtSecret,
		googleClientID:  googleClientID,
		accessTokenTTL:  15 * time.Minute,
		refreshTokenTTL: 30 * 24 * time.Hour,
	}
}

func (s *AuthService) Register(ctx context.Context, email, password, displayName string) (*TokenPair, error) {
	existing, err := s.repo.FindByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("email already exists")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	user := &models.User{
		Email:        email,
		DisplayName:  displayName,
		PasswordHash: string(hash),
		Provider:     "local",
	}
	if err := s.repo.Create(ctx, user); err != nil {
		return nil, err
	}
	return s.issueTokenPair(ctx, user.ID.Hex(), user.Email)
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*TokenPair, error) {
	user, err := s.repo.FindByEmail(ctx, email)
	if err != nil || user == nil {
		return nil, errors.New("invalid credentials")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New("invalid credentials")
	}
	return s.issueTokenPair(ctx, user.ID.Hex(), user.Email)
}

func (s *AuthService) GoogleLogin(ctx context.Context, idToken, displayName string) (*TokenPair, error) {
	email, err := verifyGoogleIDToken(idToken, s.googleClientID)
	if err != nil {
		return nil, err
	}
	user, err := s.repo.FindByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if user == nil {
		user = &models.User{
			Email:       email,
			DisplayName: displayName,
			Provider:    "google",
		}
		if err := s.repo.Create(ctx, user); err != nil {
			return nil, err
		}
	}
	return s.issueTokenPair(ctx, user.ID.Hex(), user.Email)
}

func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (*TokenPair, error) {
	claims, err := security.ParseToken(s.jwtSecret, refreshToken)
	if err != nil || claims.Type != "refresh" {
		return nil, errors.New("invalid refresh token")
	}

	stored, err := s.tokenRepo.FindRefreshToken(ctx, claims.JTI)
	if err != nil || stored == nil || stored.Revoked || stored.ExpiresAt.Before(time.Now()) {
		return nil, errors.New("refresh token revoked or expired")
	}

	_ = s.tokenRepo.RevokeRefreshToken(ctx, claims.JTI)
	return s.issueTokenPair(ctx, claims.UserID, claims.Email)
}

func (s *AuthService) Logout(ctx context.Context, accessToken, refreshToken string) error {
	accessClaims, err := security.ParseToken(s.jwtSecret, accessToken)
	if err == nil && accessClaims.JTI != "" {
		_ = s.tokenRepo.BlacklistAccessToken(ctx, &models.BlacklistedToken{
			TokenID:   accessClaims.JTI,
			ExpiresAt: accessClaims.ExpiresAt.Time,
		})
	}

	refreshClaims, err := security.ParseToken(s.jwtSecret, refreshToken)
	if err == nil && refreshClaims.JTI != "" {
		_ = s.tokenRepo.RevokeRefreshToken(ctx, refreshClaims.JTI)
	}
	return nil
}

func (s *AuthService) IsAccessTokenBlocked(ctx context.Context, token string) bool {
	claims, err := security.ParseToken(s.jwtSecret, token)
	if err != nil || claims.Type != "access" {
		return true
	}
	blocked, err := s.tokenRepo.IsAccessTokenBlacklisted(ctx, claims.JTI)
	return err == nil && blocked
}

func (s *AuthService) issueTokenPair(ctx context.Context, userID, email string) (*TokenPair, error) {
	accessJTI := models.NewTokenID()
	refreshJTI := models.NewTokenID()

	accessToken, err := security.GenerateToken(s.jwtSecret, userID, email, "access", accessJTI, s.accessTokenTTL)
	if err != nil {
		return nil, err
	}
	refreshToken, err := security.GenerateToken(s.jwtSecret, userID, email, "refresh", refreshJTI, s.refreshTokenTTL)
	if err != nil {
		return nil, err
	}
	if err := s.tokenRepo.SaveRefreshToken(ctx, &models.RefreshToken{
		UserID:    userID,
		TokenID:   refreshJTI,
		ExpiresAt: time.Now().Add(s.refreshTokenTTL),
		Revoked:   false,
	}); err != nil {
		return nil, err
	}
	return &TokenPair{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}
