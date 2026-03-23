package services

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
)

type googleTokenInfo struct {
	Email string `json:"email"`
	Aud   string `json:"aud"`
}

func verifyGoogleIDToken(idToken, expectedAud string) (string, error) {
	endpoint := "https://oauth2.googleapis.com/tokeninfo?id_token=" + url.QueryEscape(idToken)
	resp, err := http.Get(endpoint)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", errors.New("invalid google id token")
	}

	var info googleTokenInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return "", err
	}
	if expectedAud != "" && info.Aud != expectedAud {
		return "", errors.New("google token audience mismatch")
	}
	if info.Email == "" {
		return "", errors.New("google email is missing")
	}
	return info.Email, nil
}
