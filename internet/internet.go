package internet

import (
	"crypto/rsa"
	"io"
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	log "github.com/sirupsen/logrus"
	"github.com/getblank/uuid"
	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"

	"github.com/getblank/blank-router/berrors"
	"github.com/getblank/blank-router/config"
	"github.com/getblank/blank-router/intranet"
	"github.com/getblank/blank-router/settings"
	"github.com/getblank/blank-router/taskq"
)

var (
	port = "8080"
	e    = echo.New()

	publicPemKey    []byte
	publicRSAKey    *rsa.PublicKey
	publicKeyLocker sync.RWMutex

	srClient SRClient
)

type SRClient interface {
	CheckSession(apiKey string) (string, error)
	DeleteSession(apiKey string) error
	NewSession(user map[string]interface{}, sessionID string) (string, error)
	AddSubscription(apiKey, connID, uri string, extra interface{}) error
	DeleteConnection(apiKey, connID string) error
	DeleteSubscription(apiKey, connID, uri string) error
}

// Init starts internet http server
func Init(srCl SRClient, version string) {
	srClient = srCl

	if p := os.Getenv("BLANK_HTTP_PORT"); p != "" {
		port = p
	}

	log.Info("Init internet server on port ", port)
	e.Pre(middleware.RemoveTrailingSlash())
	e.Use(middleware.Gzip())
	e.Use(loggerMiddleware())
	e.Use(serverHeadersMiddleware(version))
	e.Use(middleware.Recover())

	e.GET("/", func(c echo.Context) error {
		return c.Redirect(http.StatusTemporaryRedirect, "app/")
	})

	assetsGroup := e.Group("/*", func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if c.Request().Method != "GET" {
				c.Response().Header().Set("Allow", "GET")
				return c.String(http.StatusMethodNotAllowed, "Allow: GET")
			}
			return next(c)
		}
	})

	assetsGroup.GET("/*", assetsHandler)
	e.GET("/public-key", func(c echo.Context) error {
		publicKeyLocker.RLock()
		defer publicKeyLocker.RUnlock()
		return c.String(http.StatusOK, string(publicPemKey))
	})

	e.POST("/login", loginHandler, allowAnyOriginMiddleware())
	e.POST("/logout", logoutHandler, allowAnyOriginMiddleware())
	e.GET("/logout", logoutHandler, allowAnyOriginMiddleware())
	e.POST("/register", registerHandler, allowAnyOriginMiddleware())
	e.POST("/check-user", checkUserHTTPHandler, allowAnyOriginMiddleware())
	e.POST("/send-reset-link", sendResetLinkHTTPHandler, allowAnyOriginMiddleware())
	e.POST("/reset-password", resetPasswordHTTPHandler, allowAnyOriginMiddleware())

	e.GET("/facebook-login", facebookLoginHandler)

	e.GET("/check-jwt", checkJWTHandler, allowAnyOriginMiddleware())
	e.POST("/check-jwt", checkJWTHandler, allowAnyOriginMiddleware())
	e.OPTIONS("/check-jwt", checkJWTOptionsHandler, allowAnyOriginMiddleware())

	e.GET("/sso-frame", ssoFrameHandler, allowAnyOriginMiddleware())

	wamp = wampInit()
	e.GET("/wamp", wampHandler)

	e.GET("/common-settings", commonSettingsHandler)

	config.OnUpdate(onConfigUpdate)

	intranet.OnEvent(func(uri string, event interface{}, connIDs []string) {
		w.SendEvent(uri, event, connIDs)
	})

	if certFile, keyFile := os.Getenv("BLANK_SSL_CRT"), os.Getenv("BLANK_SSL_KEY"); certFile != "" && keyFile != "" {
		log.Info("Starting internet server with SSL on port ", port)
		e.StartTLS(":"+port, certFile, keyFile)
	}

	log.Info("Starting internet server on port ", port)
	log.Fatal(e.Start(":" + port))
}

func checkJWTOptionsHandler(c echo.Context) error {
	c.Response().Header().Set("Access-Control-Allow-Method", "GET, POST")
	c.Response().Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
	return nil
}

func checkJWTHandler(c echo.Context) error {
	res := map[string]interface{}{"valid": false}
	var valid bool
	publicKeyLocker.Lock()
	if publicRSAKey == nil {
		publicKeyLocker.Unlock()
		log.Warn("JWT is not ready yet")
		return c.JSON(http.StatusOK, res)
	}

	publicKeyLocker.Unlock()
	if token := extractToken(c); token != "" {
		if claims, err := extractClaimsFromJWT(token); err == nil {
			if _, err = srClient.CheckSession(claims.SessionID); err == nil {
				res["valid"] = true
				user := map[string]interface{}{}
				user["_id"] = claims.UserID
				for k, v := range claims.Extra {
					user[k] = v
				}

				res["user"] = user
				valid = true
			}
		}
	}

	if !valid {
		if cookie, err := c.Cookie("access_token"); err == nil {
			cookie.Value = ""
			cookie.MaxAge = -1
			c.SetCookie(cookie)
		}

		return c.JSON(http.StatusForbidden, res)
	}

	return c.JSON(http.StatusOK, res)
}

func facebookLoginHandler(c echo.Context) error {
	sessionID := uuid.NewV4()
	t := taskq.Task{
		Type: taskq.Auth,
		Arguments: map[string]interface{}{
			"social":      "facebook",
			"code":        c.QueryParam("code"),
			"redirectUrl": c.QueryParam("redirectUrl"),
			"sessionID":   sessionID,
		},
	}
	res, err := taskq.PushAndGetResult(&t, 0)
	if err != nil {
		return c.HTML(http.StatusSeeOther, err.Error())
	}
	user, ok := res.(map[string]interface{})
	if !ok {
		log.WithField("result", res).Warn("Invalid type of result on http login")
		return c.HTML(http.StatusInternalServerError, berrors.ErrError.Error())
	}

	apiKey, err := srClient.NewSession(user, sessionID)
	if err != nil {
		return c.HTML(http.StatusInternalServerError, err.Error())
	}

	claims, err := extractClaimsFromJWT(apiKey)
	if err != nil {
		log.Warnf("Can't parse JWT error: '%s', token: '%s'", err.Error(), apiKey)
	}

	expiresAt := strconv.Itoa(int(claims.ExpiresAt))

	result := `<script>
		(function(){
			localStorage.setItem("blank-access-token", "` + apiKey + `");
			createCookie("blank-token", "` + apiKey + `", ` + expiresAt + `);
			var redirectUrl = location.search.match(/redirectUrl=([^&]*)&?/);
			if (redirectUrl) {
				window.location = decodeURIComponent(redirectUrl[1]);
				return;
			}
			window.location = location.protocol + "//" + location.host;

			function createCookie(name, value, expiresAt) {
				var cookie = "" + name + "=" + value,
					deleting = expiresAt === -1,
					expires = "";
				if (expiresAt) {
					expires = "; expires=" + new Date(deleting ? 0 : expiresAt * 1000).toGMTString();
				}

				const hostname = document.location.hostname.split(".");
				for (var i = hostname.length - 1; i >= 0; i--) {
					const h = hostname.slice(i).join(".");
					document.cookie = cookie + expires + "; path=\/; domain=." + h + ";";
					if (!deleting && document.cookie.indexOf(cookie) > -1) {
						return;
					}
				}
			}
		}());
	</script>`
	return c.HTML(http.StatusOK, result)
}

func loginHandler(c echo.Context) error {
	formParams, err := c.FormParams()
	if err != nil {
		return c.JSON(http.StatusBadRequest, berrors.ErrInvalidArguments.Error())
	}

	login := c.FormValue("login")
	password := c.FormValue("password")
	hashedPassword := c.FormValue("hashedPassword")
	if len(login) == 0 || (len(password) == 0 && len(hashedPassword) == 0) {
		return c.JSON(http.StatusBadRequest, berrors.ErrInvalidArguments.Error())
	}

	fp := map[string]interface{}{}
	for k := range formParams {
		fp[k] = c.FormValue(k)
	}

	sessionID := uuid.NewV4()
	fp["sessionID"] = sessionID
	t := taskq.Task{
		Type:      taskq.Auth,
		Arguments: fp,
	}
	res, err := taskq.PushAndGetResult(&t, 0)
	if err != nil {
		return c.JSON(http.StatusForbidden, err.Error())
	}
	user, ok := res.(map[string]interface{})
	if !ok {
		log.WithField("result", res).Warn("Invalid type of result on http login")
		return c.JSON(http.StatusInternalServerError, berrors.ErrError.Error())
	}

	accessToken, err := srClient.NewSession(user, sessionID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	claims, err := extractClaimsFromJWT(accessToken)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	accessTokenCookie := &http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Expires:  time.Unix(claims.ExpiresAt, 0),
		Path:     "/",
		HttpOnly: true,
	}
	c.SetCookie(accessTokenCookie)

	result := map[string]interface{}{
		"access_token": accessToken,
		"user":         user,
	}
	return c.JSON(http.StatusOK, result)
}

func logoutHandler(c echo.Context) error {
	accessToken := extractToken(c)
	if len(accessToken) == 0 {
		return c.JSON(http.StatusOK, http.StatusText(http.StatusOK))
	}

	claims, err := extractClaimsFromJWT(accessToken)
	if err != nil {
		clearBlankToken(c)
		return c.JSON(http.StatusOK, http.StatusText(http.StatusOK))
	}

	apiKey, userID := claims.SessionID, claims.UserID
	arguments := map[string]interface{}{"userId": userID, "sessionId": apiKey}
	for k, v := range claims.Extra {
		arguments[k] = v
	}

	t := taskq.Task{
		Type:      taskq.SignOut,
		UserID:    userID,
		Arguments: arguments,
	}
	_, err = taskq.PushAndGetResult(&t, 30*time.Second)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	_, err = srClient.CheckSession(apiKey)
	if err != nil {
		log.Warnf("srClient.CheckSession for apiKey %s error: %v", apiKey, err)
		return c.JSON(http.StatusOK, http.StatusText(http.StatusOK))
	}

	err = srClient.DeleteSession(apiKey)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	go func() {
		t := taskq.Task{
			Type:      taskq.DidSignOut,
			UserID:    userID,
			Arguments: arguments,
		}
		_, err = taskq.PushAndGetResult(&t, 30*time.Second)
		if err != nil {
			log.Errorf("User %s didSignOut error: %v", userID, err)
		}
	}()

	if redirectURL := c.QueryParam("redirectUrl"); redirectURL != "" {
		clearBlankToken(c)
		return c.Redirect(http.StatusTemporaryRedirect, redirectURL)
	}

	clearBlankToken(c)
	return c.JSON(http.StatusOK, http.StatusText(http.StatusOK))
}

func registerHandler(c echo.Context) error {
	formParams, err := c.FormParams()
	if err != nil {
		return c.JSON(http.StatusBadRequest, berrors.ErrInvalidArguments.Error())
	}

	args := map[string]interface{}{"redirectUrl": c.QueryParam("redirectUrl")}
	for k := range formParams {
		args[k] = c.FormValue(k)
	}

	t := taskq.Task{
		Type:      taskq.SignUp,
		Arguments: args,
	}

	res, err := taskq.PushAndGetResult(&t, 0)
	if err != nil {
		return c.JSON(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, res)
}

func checkUserHTTPHandler(c echo.Context) error {
	email := c.FormValue("email")
	if email == "" {
		return c.JSON(http.StatusBadRequest, berrors.ErrInvalidArguments.Error())
	}

	t := taskq.Task{
		Type:   taskq.DbFind,
		UserID: "root",
		Store:  "users",
		Arguments: map[string]interface{}{
			"query": map[string]interface{}{
				"query": map[string]interface{}{
					"email": email,
				},
				"props": []string{"_id"},
			},
		},
	}
	_res, err := taskq.PushAndGetResult(&t, 0)
	if err != nil {
		return c.JSON(http.StatusOK, "USER_NOT_FOUND")
	}
	res, ok := _res.(map[string]interface{})
	if !ok {
		return c.JSON(http.StatusInternalServerError, berrors.ErrError)
	}
	_items, ok := res["items"]
	if !ok {
		return c.JSON(http.StatusInternalServerError, berrors.ErrError)
	}
	items, ok := _items.([]interface{})
	if !ok {
		return c.JSON(http.StatusInternalServerError, berrors.ErrError)
	}
	if len(items) > 0 {
		return c.JSON(http.StatusOK, "USER_EXISTS")
	}
	return c.JSON(http.StatusOK, "USER_NOT_FOUND")
}

func sendResetLinkHTTPHandler(c echo.Context) error {
	email := c.FormValue("email")
	if email == "" {
		return c.JSON(http.StatusBadRequest, berrors.ErrInvalidArguments.Error())
	}

	t := taskq.Task{
		Type: taskq.PasswordResetRequest,
		Arguments: map[string]interface{}{
			"email": email,
		},
	}
	res, err := taskq.PushAndGetResult(&t, 0)
	if err != nil {
		return c.JSON(http.StatusSeeOther, err.Error())
	}
	return c.JSON(http.StatusOK, res)
}

func resetPasswordHTTPHandler(c echo.Context) error {
	formParams, err := c.FormParams()
	if err != nil {
		return c.JSON(http.StatusBadRequest, berrors.ErrInvalidArguments.Error())
	}

	args := map[string]interface{}{}
	for k := range formParams {
		args[k] = c.FormValue(k)
	}

	t := taskq.Task{
		Type:      taskq.PasswordReset,
		Arguments: args,
	}

	res, err := taskq.PushAndGetResult(&t, 0)
	if err != nil {
		return c.JSON(http.StatusSeeOther, err.Error())
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
	uriPath := c.Request().URL.Path
	var uri string
	assetsRequest := strings.HasPrefix(uriPath, "/app/assets")
	if uriPath == "/" || (strings.HasPrefix(uriPath, "/app") && !assetsRequest) {
		uri = "/assets/blank/index.html"
	} else {
		uri = strings.TrimPrefix(uriPath, "/app")
	}

	if assetsRequest {

	}

	if len(path.Ext(uri)) == 0 {
		uri += "/index.html"
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
	contentType := mime.TypeByExtension(filepath.Ext(uri))
	if len(contentType) > 0 {
		return contentType
	}

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

func detectContentType(fileName string, content []byte) string {
	ctype := mime.TypeByExtension(filepath.Ext(fileName))
	if ctype == "" {
		ctype = http.DetectContentType(content)
	}

	return ctype
}
