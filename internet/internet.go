package internet

import (
	"bytes"
	"net/http"
	"path"
	"strings"

	log "github.com/Sirupsen/logrus"
	"github.com/labstack/echo"
	"github.com/labstack/echo/engine/standard"
	"github.com/labstack/echo/middleware"
	"golang.org/x/net/websocket"

	"github.com/getblank/blank-router/config"
	"github.com/getblank/blank-router/intranet"
	"github.com/getblank/blank-router/settings"
	"github.com/getblank/blank-router/taskq"
)

var (
	port = "8080"
	e    = echo.New()
)

func init() {
	log.Info("Init internet server on port ", port)
	e.Use(middleware.Gzip())
	// e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	e.Use(staticFromAssets("/static"))

	e.GET("/*", assetsHandler)

	wamp := wampInit()
	e.GET("/wamp", standard.WrapHandler(websocket.Handler(func(ws *websocket.Conn) {
		wamp.WampHandler(ws, nil)
	})))

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
			switch {
			case strings.HasPrefix(file, "/fonts"):
				c.Response().Header().Set(echo.HeaderContentType, getContentType(file))
				content, err := Asset("src" + file)
				log.Info("FONT: ", file)
				if err != nil {
					c.Response().WriteHeader(http.StatusNotFound)
					return err
				}
				c.Response().WriteHeader(http.StatusOK)
				c.Response().Write(content)
				return nil
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

func assetsHandler(c echo.Context) error {
	var uri = "/assets/blank" + strings.Split(c.Request().URI(), "?")[0]
	if uri == "/assets/blank/" {
		uri = "/assets/blank/index.html"
	}
	res, err := http.Get(settings.SRHTTPAddress + uri)
	if err != nil {
		c.Response().WriteHeader(http.StatusNotFound)
		return err
	}
	buf := bytes.NewBuffer(nil)
	_, err = buf.ReadFrom(res.Body)
	if err != nil {
		log.WithError(err).Error("Can't read from SR responsed file")
	}
	c.Response().Header().Set(echo.HeaderContentType, getContentType(uri))
	c.Response().WriteHeader(res.StatusCode)
	content := buf.Bytes()
	_, err = c.Response().Write(content)
	return err
}

func getContentType(uri string) string {
	var contentType string
	switch path.Ext(uri) {
	case ".js":
		contentType = "text/javascript"
	case ".css":
		contentType = "text/css"
	case ".html":
		contentType = "text/html"
	case ".pdf":
		contentType = "application/pdf"
	case ".json":
		contentType = "application/json"
	case ".gif":
		contentType = "image/gif"
	case ".jpg", ".jpeg":
		contentType = "image/jpeg"
	case ".png":
		contentType = "image/png"
	case ".svg":
		contentType = "image/svg+xml"
	case ".ttf":
		contentType = "application/x-font-ttf"
	case ".otf":
		contentType = "application/x-font-opentype"
	case ".woff":
		contentType = "application/font-woff"
	case ".woff2":
		contentType = "application/font-woff2"
	case ".eot":
		contentType = "application/vnd.ms-fontobject"
	case ".sfnt":
		contentType = "application/font-sfnt"

	default:
		contentType = "multipart/mixed"
	}
	return contentType
}
