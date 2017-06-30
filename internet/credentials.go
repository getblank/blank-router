package internet

import (
	"net/http"

	"github.com/labstack/echo"
)

type credentials struct {
	userID    interface{}
	sessionID string
	claims    *blankClaims
}

func clearBlankToken(c echo.Context) {
	c.SetCookie(&http.Cookie{Name: "access_token", Value: "deleted", Path: "/", MaxAge: -1})
}
