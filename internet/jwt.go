package internet

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	log "github.com/sirupsen/logrus"
	"github.com/buger/jsonparser"
	"github.com/dgrijalva/jwt-go"

	"github.com/getblank/blank-router/settings"
)

type blankClaims struct {
	UserID    interface{} `json:"userId"`
	SessionID string      `json:"sessionId"`
	Extra     map[string]interface{}
	jwt.StandardClaims
}

func (b *blankClaims) toMap() map[string]interface{} {
	res := map[string]interface{}{
		"_id": b.UserID,
		"jwtInfo": map[string]interface{}{
			"userId":    b.UserID,
			"sessionId": b.SessionID,
			"issuedAt":  b.IssuedAt,
			"ussiedBy":  b.Issuer,
			"expiredAt": b.ExpiresAt,
		},
	}

	for k, v := range b.Extra {
		res[k] = v
	}

	return res
}

func (b *blankClaims) UnmarshalJSON(p []byte) error {
	if b.Extra == nil {
		b.Extra = map[string]interface{}{}
	}

	jsonparser.ObjectEach(p, func(key []byte, value []byte, dataType jsonparser.ValueType, offset int) error {
		k := string(key)
		switch k {
		// standard claims
		case "aud":
			if dataType != jsonparser.String {
				return fmt.Errorf("invalid value type for key %s", k)
			}
			b.Audience, _ = jsonparser.ParseString(value)
		case "exp":
			if dataType != jsonparser.Number {
				return fmt.Errorf("invalid value type for key %s", k)
			}
			b.ExpiresAt, _ = jsonparser.ParseInt(value)
		case "jti":
			if dataType != jsonparser.String {
				return fmt.Errorf("invalid value type for key %s", k)
			}
			b.Id, _ = jsonparser.ParseString(value)
		case "iat":
			if dataType != jsonparser.Number {
				return fmt.Errorf("invalid value type for key %s", k)
			}
			b.IssuedAt, _ = jsonparser.ParseInt(value)
		case "iss":
			if dataType != jsonparser.String {
				return fmt.Errorf("invalid value type for key %s", k)
			}
			b.Issuer, _ = jsonparser.ParseString(value)
		case "nbf":
			if dataType != jsonparser.Number {
				return fmt.Errorf("invalid value type for key %s", k)
			}
			b.NotBefore, _ = jsonparser.ParseInt(value)
		case "sub":
			if dataType != jsonparser.String {
				return fmt.Errorf("invalid value type for key %s", k)
			}
			b.Subject, _ = jsonparser.ParseString(value)

			// custom claims
		case "sessionId":
			if dataType != jsonparser.String {
				return fmt.Errorf("invalid value type for key %s", k)
			}
			b.SessionID, _ = jsonparser.ParseString(value)
		case "userId":
			val, err := parseInterface(value, dataType)
			if err != nil {
				return err
			}
			b.UserID = val
		default:
			val, err := parseInterface(value, dataType)
			if err != nil {
				return err
			}
			b.Extra[k] = val
		}
		return nil
	})

	return nil
}

func parseInterface(value []byte, dataType jsonparser.ValueType) (val interface{}, err error) {
	switch dataType {
	case jsonparser.String:
		val, _ = jsonparser.ParseString(value)
	case jsonparser.Number:
		val, _ = jsonparser.ParseFloat(value)
	case jsonparser.Object, jsonparser.Array:
		err = json.Unmarshal(value, &val)
	case jsonparser.Boolean:
		val, _ = jsonparser.ParseBoolean(value)
	}

	return val, err
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

func extractAPIKeyAndUserIDromJWT(token string) (apiKey string, userID interface{}, err error) {
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
