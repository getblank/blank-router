package internet

import "github.com/labstack/echo"

func serverHeadersMiddleware(version string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Response().Header().Add("Server", "Blank Router/"+version+" (https://getblank.net)")
			return next(c)
		}
	}
}
