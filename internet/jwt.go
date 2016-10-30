package internet

import (
	"bytes"
	"errors"
	"io"
	"net/http"
	"time"

	log "github.com/Sirupsen/logrus"
	"github.com/dgrijalva/jwt-go"

	"github.com/getblank/blank-router/settings"
)

type blankClaims struct {
	UserID    string `json:"userId"`
	SessionID string `json:"sessionId"`
	jwt.StandardClaims
}

func getPublicRSAKey() {
	publicKeyURI := settings.SRHTTPAddress + "/public-key"
	log.Infof("Try to load public RSA key from '%s'", publicKeyURI)
	res, err := http.Get(settings.SRHTTPAddress + "/public-key")
	if err != nil {
		log.Fatal("Can't get public RSA key")
		panic(err)
	}
	defer res.Body.Close()
	log.Infof("Public RSA key received from '%s'", publicKeyURI)
	publicKeyLocker.Lock()
	defer publicKeyLocker.Unlock()
	buf := new(bytes.Buffer)
	_, err = io.Copy(buf, res.Body)
	if err != nil {
		panic(err)
	}

	publicRSAKey, err = jwt.ParseRSAPublicKeyFromPEM(buf.Bytes())
	if err != nil {
		log.Fatal("Invalid public RSA key", err)
		panic(err)
	}

	publicPemKey = buf.Bytes()
}

func jwtChecker(t *jwt.Token) (interface{}, error) {
	claims, ok := t.Claims.(*blankClaims)
	if !ok {
		return nil, errors.New("invalid claims")
	}
	if !claims.VerifyIssuer("Blank ltd", true) {
		return nil, errors.New("unknown issuer")
	}
	if !claims.VerifyExpiresAt(time.Now().Unix(), true) {
		return nil, errors.New("token expired")
	}
	return publicRSAKey, nil
}

func extractAPIKeyAndUserIDromJWT(token string) (apiKey, userID string, err error) {
	claims, err := extractClaimsFromJWT(token)
	return claims.SessionID, claims.UserID, err
}

func extractClaimsFromJWT(token string) (claims *blankClaims, err error) {
	claims = new(blankClaims)
	publicKeyLocker.Lock()
	defer publicKeyLocker.Unlock()
	_, err = jwt.ParseWithClaims(token, claims, jwtChecker)
	return claims, err
}
