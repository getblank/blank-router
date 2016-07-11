package internet

import (
	"fmt"
	"net/http"
	"time"

	"github.com/getblank/blank-router/settings"

	log "github.com/Sirupsen/logrus"
	"github.com/labstack/echo"
)

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
