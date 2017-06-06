package internet

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/getblank/blank-router/intranet"
	"github.com/getblank/blank-router/settings"

	log "github.com/Sirupsen/logrus"
	"github.com/labstack/echo"
)

// ErrSessionNotFound error
var ErrSessionNotFound = errors.New("session not found")

func jwtAuthMiddleware(allowGuests bool) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			accessToken := extractToken(c)
			if accessToken == "" {
				if allowGuests {
					c.Set("cred", credentials{userID: "guest"})
					return next(c)
				}
				return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
			}

			publicKeyLocker.Lock()
			if publicRSAKey == nil {
				publicKeyLocker.Unlock()
				log.Warn("JWT is not ready yet")
				return c.JSON(http.StatusInternalServerError, http.StatusText(http.StatusInternalServerError))
			}
			publicKeyLocker.Unlock()

			claims, err := extractClaimsFromJWT(accessToken)
			if err != nil {
				return c.JSON(http.StatusForbidden, err.Error())
			}

			_, err = intranet.CheckSession(claims.SessionID)
			if err != nil {
				return c.JSON(http.StatusForbidden, ErrSessionNotFound.Error())
			}

			c.Set("cred", credentials{userID: claims.UserID, sessionID: claims.SessionID, extra: claims.Extra})
			return next(c)
		}
	}
}

func allowAnyOriginMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Response().Header().Add("Access-Control-Allow-Origin", "*")
			return next(c)
		}
	}
}

func loggerMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if !settings.DevMode {
				return next(c)
			}
			start := time.Now()
			entry := log.WithFields(log.Fields{
				"request": c.Request().URL.RequestURI,
				"method":  c.Request().Method,
				"remote":  c.Request().RemoteAddr,
			})
			if reqID, ok := c.Request().Header["X-Request-Id"]; ok {
				entry = entry.WithField("request_id", reqID[0])
			}
			entry.Info("New request received")

			if err := next(c); err != nil {
				c.Error(err)
			}

			latency := time.Since(start)
			entry.WithFields(log.Fields{
				"status":      c.Response().Status,
				"text_status": http.StatusText(c.Response().Status),
				"took":        latency,
				fmt.Sprintf("measure#internet.latency"): latency.Nanoseconds(),
			}).Info("Request completed")

			return nil
		}
	}
}

func serverHeadersMiddleware(version string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Response().Header().Add("Server", "Blank Router/"+version+" (https://getblank.net)")
			return next(c)
		}
	}
}

func extractToken(c echo.Context) string {
	var accessToken string
	if authHeader := c.Request().Header.Get("Authorization"); len(authHeader) != 0 {
		if strings.HasPrefix(authHeader, "Bearer ") {
			return strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		}
	}

	accessToken = c.QueryParam("access_token")
	if len(accessToken) == 0 {
		if cookie, err := c.Cookie("access_token"); err == nil && cookie.Expires.Before(time.Now()) {
			accessToken = cookie.Value
		}
	}

	return accessToken
}
