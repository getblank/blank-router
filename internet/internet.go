package internet

import (
	"net/http"

	"golang.org/x/net/websocket"

	"github.com/getblank/blank-router/taskq"
	"github.com/labstack/echo"
	"github.com/labstack/echo/engine/standard"
	"github.com/labstack/echo/middleware"
)

func init() {
	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	wamp := wampInit()
	e.GET("/wamp", standard.WrapHandler(websocket.Handler(func(ws *websocket.Conn) {
		wamp.WampHandler(ws, nil)
	})))

	e.File("/", "static/html/index.html")
	e.File("/app.css", "static/css/app.css")

	e.Static("/fonts", "static/fonts")
	e.Static("/css", "static/css")
	e.Static("/js", "static/js")

	e.Get("/common-settings", commonSettingsHandler)

	go e.Run(standard.New(":8080"))
}

func commonSettingsHandler(c echo.Context) error {
	t := taskq.Task{
		Type:      taskq.CommonSettings,
		UserID:    "guest",
		Arguments: map[string]interface{}{},
	}
	lang := c.QueryParam("lang")
	if lang != "" {
		t.Arguments = map[string]interface{}{
			"lang": lang,
		}
	}

	resChan := taskq.Push(t)

	res := <-resChan
	if res.Err != "" {
		return c.JSON(http.StatusNotFound, res.Err)
	}
	return c.JSON(http.StatusOK, res.Result)
}
