package internet

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/getblank/blank-router/intranet"
	"github.com/getblank/blank-router/settings"
	"github.com/ivahaev/go-logger"

	log "github.com/Sirupsen/logrus"
	"github.com/labstack/echo"
)

// ErrSessionNotFound error
var ErrSessionNotFound = errors.New("session not found")

func jwtAuthMiddleware(allowGuests bool) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			var accessToken string
			if c.Request().Header().Contains("Authorization") {
				authHeader := c.Request().Header().Get("Authorization")
				if !strings.HasPrefix(authHeader, "Bearer ") {
					return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
				}
				accessToken = strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
			} else {
				accessToken = c.QueryParam("access_token")
			}
			if accessToken == "" {
				if allowGuests {
					c.Set("cred", credentials{userID: "guest"})
					return next(c)
				}
				return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
			}

			apiKey, userID, err := extractDataFromJWT(accessToken)
			if err != nil {
				return c.JSON(http.StatusForbidden, err.Error())
			}
			_, err = intranet.CheckSession(apiKey)
			if err != nil {
				logger.Debug(err)
				return c.JSON(http.StatusForbidden, ErrSessionNotFound.Error())
			}
			c.Set("cred", credentials{userID: userID, apiKey: apiKey})
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
				"request": c.Request().URI(),
				"method":  c.Request().Method(),
				"remote":  c.Request().RemoteAddress(),
			})
			if reqID := c.Request().Header().Get("X-Request-Id"); reqID != "" {
				entry = entry.WithField("request_id", reqID)
			}
			entry.Info("New request received")

			if err := next(c); err != nil {
				c.Error(err)
			}

			latency := time.Since(start)
			entry.WithFields(log.Fields{
				"status":      c.Response().Status(),
				"text_status": http.StatusText(c.Response().Status()),
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
