package internet

import (
	"io"
	"net/http"
	"os"
	"path"
	"strings"
	"time"

	log "github.com/Sirupsen/logrus"
	"github.com/labstack/echo"
	"github.com/labstack/echo/engine/standard"
	"github.com/labstack/echo/middleware"
	"golang.org/x/net/websocket"

	"github.com/getblank/blank-router/berrors"
	"github.com/getblank/blank-router/config"
	"github.com/getblank/blank-router/intranet"
	"github.com/getblank/blank-router/settings"
	"github.com/getblank/blank-router/taskq"
)

var (
	port = "8080"
	e    = echo.New()
)

// Init starts internet http server
func Init(version string) {
	log.Info("Init internet server on port ", port)
	e.Pre(middleware.RemoveTrailingSlash())
	e.Use(middleware.Gzip())
	e.Use(loggerMiddleware())
	e.Use(serverHeadersMiddleware(version))
	e.Use(middleware.Recover())

	assetsGroup := e.Group("/*", func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if c.Request().Method() != "GET" {
				return c.String(http.StatusMethodNotAllowed, "Allow: GET")
			}
			return next(c)
		}
	})
	assetsGroup.GET("/*", assetsHandler)

	e.POST("/login", loginHandler, allowAnyOriginMiddleware())
	e.POST("/logout", logoutHandler, allowAnyOriginMiddleware())
	e.GET("/logout", logoutHandler, allowAnyOriginMiddleware())
	e.POST("/register", registerHandler, allowAnyOriginMiddleware())

	e.GET("/facebook-login", facebookLoginHandler)

	wamp := wampInit()
	e.GET("/wamp", standard.WrapHandler(websocket.Handler(func(ws *websocket.Conn) {
		wamp.WampHandler(ws, nil)
	})))

	e.GET("/common-settings", commonSettingsHandler)

	config.OnUpdate(onConfigUpdate)

	intranet.OnEvent(func(uri string, event interface{}, connIDs []string) {
		w.SendEvent(uri, event, connIDs)
	})
	if certFile, keyFile := os.Getenv("BLANK_SSL_CRT"), os.Getenv("BLANK_SSL_KEY"); certFile != "" && keyFile != "" {
		log.Info("Starting internet server with SSL on port ", port)
		e.Run(standard.WithTLS(":"+port, certFile, keyFile))
	}
	log.Info("Starting internet server on port ", port)
	e.Run(standard.New(":" + port))
}

func facebookLoginHandler(c echo.Context) error {
	t := taskq.Task{
		Type: taskq.Auth,
		Arguments: map[string]interface{}{
			"social":      "facebook",
			"code":        c.QueryParam("code"),
			"redirectUrl": c.QueryParam("redirectUrl"),
		},
	}
	res, err := taskq.PushAndGetResult(&t, time.Second*10)
	if err != nil {
		return c.HTML(http.StatusSeeOther, err.Error())
	}
	user, ok := res.(map[string]interface{})
	if !ok {
		log.WithField("result", res).Warn("Invalid type of result on http login")
		return c.HTML(http.StatusInternalServerError, berrors.ErrError.Error())
	}
	userID, ok := user["_id"].(string)
	if !ok {
		log.WithField("user._id", user["_id"]).Warn("Invalid type of user._id on http login")
		return c.HTML(http.StatusInternalServerError, berrors.ErrError.Error())
	}

	apiKey, err := intranet.NewSession(userID, user)
	if err != nil {
		return c.HTML(http.StatusInternalServerError, err.Error())
	}

	result := `<script>
		(function(){
			localStorage.setItem("tempKey", "` + apiKey + `");
			let redirectUrl = location.search.match(/redirectUrl=([^&]*)&?/);
			if (redirectUrl) {
				window.location = decodeURIComponent(redirectUrl[1]);
				return;
			}
			window.location = location.protocol + "//" + location.host;
		}());
	</script>`
	return c.HTML(http.StatusOK, result)
}

func loginHandler(c echo.Context) error {
	login := c.FormValue("login")
	if login == "" {
		return c.JSON(http.StatusBadRequest, berrors.ErrInvalidArguments.Error())
	}
	password := c.FormValue("password")
	if password == "" {
		return c.JSON(http.StatusBadRequest, berrors.ErrInvalidArguments.Error())
	}
	t := taskq.Task{
		Type: taskq.Auth,
		Arguments: map[string]interface{}{
			"login":    login,
			"password": password,
		},
	}
	res, err := taskq.PushAndGetResult(&t, time.Second*5)
	if err != nil {
		return c.JSON(http.StatusSeeOther, err.Error())
	}
	user, ok := res.(map[string]interface{})
	if !ok {
		log.WithField("result", res).Warn("Invalid type of result on http login")
		return c.JSON(http.StatusInternalServerError, berrors.ErrError.Error())
	}
	userID, ok := user["_id"].(string)
	if !ok {
		log.WithField("user._id", user["_id"]).Warn("Invalid type of user._id on http login")
		return c.JSON(http.StatusInternalServerError, berrors.ErrError.Error())
	}

	apiKey, err := intranet.NewSession(userID, user)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	result := map[string]interface{}{
		"key":  apiKey,
		"user": user,
	}
	return c.JSON(http.StatusOK, result)
}

func logoutHandler(c echo.Context) error {
	apiKey := c.QueryParam("key")
	if apiKey == "" {
		return c.JSON(http.StatusBadRequest, errUserIDNotFound.Error())
	}
	err := intranet.DeleteSession(apiKey)
	if redirectURL := c.QueryParam("redirectUrl"); redirectURL != "" {
		return c.Redirect(http.StatusTemporaryRedirect, redirectURL)
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, http.StatusText(http.StatusOK))
}

func registerHandler(c echo.Context) error {
	email := c.FormValue("email")
	if email == "" {
		return c.JSON(http.StatusBadRequest, berrors.ErrInvalidArguments.Error())
	}
	password := c.FormValue("password")
	if password == "" {
		return c.JSON(http.StatusBadRequest, berrors.ErrInvalidArguments.Error())
	}
	t := taskq.Task{
		Type: taskq.SignUp,
		Arguments: map[string]interface{}{
			"email":       email,
			"password":    password,
			"redirectUrl": c.QueryParam("redirectUrl"),
		},
	}
	formParams := c.FormParams()
	if len(formParams) > 2 {
		for k, v := range formParams {
			if k == "email" || k == "password" || len(v) == 0 {
				continue
			}
			t.Arguments[k] = v[0]
		}
	}
	res, err := taskq.PushAndGetResult(&t, time.Second*10)
	if err != nil {
		return c.JSON(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, res)
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

	resChan := taskq.Push(&t)

	res := <-resChan
	if res.Err != "" {
		return c.JSON(http.StatusNotFound, res.Err)
	}
	return c.JSON(http.StatusOK, res.Result)
}

func assetsHandler(c echo.Context) error {
	var uri = "/assets" + strings.Split(c.Request().URI(), "?")[0]
	if uri == "/assets/" {
		uri = "/assets/blank/index.html"
	}
	res, err := http.Get(settings.SRHTTPAddress + uri)
	if err != nil {
		c.Response().WriteHeader(http.StatusNotFound)
		return err
	}
	defer res.Body.Close()
	c.Response().Header().Set(echo.HeaderContentType, getContentType(uri))
	c.Response().WriteHeader(res.StatusCode)
	_, err = io.Copy(c.Response(), res.Body)
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
