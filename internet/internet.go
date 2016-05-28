package internet

import (
	"net/http"
	"path"
	"strings"

	log "github.com/Sirupsen/logrus"
	"golang.org/x/net/websocket"

	"github.com/getblank/blank-router/config"
	"github.com/getblank/blank-router/intranet"
	"github.com/getblank/blank-router/taskq"
	"github.com/labstack/echo"
	"github.com/labstack/echo/engine/standard"
	"github.com/labstack/echo/middleware"
)

var (
	port = "8080"
	e    = echo.New()
)

func init() {
	log.Info("Init internet server on port ", port)
	e.Use(middleware.Gzip())
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(staticFromAssets("/static"))

	wamp := wampInit()
	e.GET("/wamp", standard.WrapHandler(websocket.Handler(func(ws *websocket.Conn) {
		wamp.WampHandler(ws, nil)
	})))

	e.GET("/", func(c echo.Context) error {
		content, err := Asset("src/html/index.html")
		if err != nil {
			return c.HTML(http.StatusNotFound, "file not found")
		}
		return c.HTML(http.StatusOK, string(content))
	})
	e.GET("/app.css", func(c echo.Context) error {
		// need to request from blank-sr
		return c.File("static/css/app.css")
		// content, err := Asset("src/html/index.html")
		// if err != nil {
		// 	return c.HTML(http.StatusNotFound, "file not found")
		// }
		// return c.HTML(http.StatusOK, string(content))
	})

	e.Static("/fonts", "static/fonts")
	e.Static("/css", "static/css")
	e.Static("/js", "static/js")

	e.GET("/common-settings", commonSettingsHandler)

	config.OnUpdate(onConfigUpdate)

	intranet.OnEvent(func(uri string, event interface{}, connIDs []string) {
		w.SendEvent(uri, event, connIDs)
	})

	go e.Run(standard.New(":" + port))
}

func staticFromAssets(root string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			p := c.Request().URL().Path()
			file := path.Clean(p)
			log.Info("Requested path:", file)
			switch {
			case strings.HasPrefix(file, "/js"):
				file = strings.TrimPrefix(file, "/js")
				c.Response().Header().Set(echo.HeaderContentType, echo.MIMEApplicationJavaScript)
				content, err := Asset("release" + file)
				if err != nil {
					c.Response().WriteHeader(http.StatusNotFound)
					return err
				}
				c.Response().WriteHeader(http.StatusOK)
				c.Response().Write(content)
				return nil
			case strings.HasPrefix(file, "/fonts"):
				c.Response().Header().Set(echo.HeaderContentType, echo.MIMEOctetStream)
				content, err := Asset("src" + file)
				if err != nil {
					c.Response().WriteHeader(http.StatusNotFound)
					return err
				}
				c.Response().WriteHeader(http.StatusOK)
				c.Response().Write(content)

			}
			return next(c)
		}
	}
}

func commonSettingsHandler(c echo.Context) error {
	t := taskq.Task{
		Type:      taskq.UserConfig,
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
