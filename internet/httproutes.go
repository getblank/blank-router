package internet

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"io/ioutil"
	"net"
	"net/http"
	"strconv"
	"strings"

	log "github.com/Sirupsen/logrus"
	"github.com/labstack/echo"
	"github.com/pkg/errors"

	"github.com/getblank/blank-router/config"
	"github.com/getblank/blank-router/settings"
	"github.com/getblank/blank-router/taskq"
	"github.com/getblank/uuid"
)

const apiV1baseURI = "/api/v1/"

var (
	routesBuildingCompleted bool
	errUserIDNotFound       = errors.New("not found")
)

type result struct {
	Type     string            `json:"type"`
	Data     string            `json:"data"`
	RAWData  interface{}       `json:"rawData"`
	Code     int               `json:"code"`
	Header   map[string]string `json:"header"`
	FileName string            `json:"fileName"`
	Store    string            `json:"store"`
	ID       string            `json:"_id"`
}

func onConfigUpdate(c map[string]config.Store) {
	w.Disconnect()
	log.Info("New config arrived")
	if routesBuildingCompleted {
		log.Warn("Routes already built. Need to restart if http hooks or actions modified.")
	}
	httpEnabledStores := []config.Store{}
	for s, store := range c {
		if !strings.HasPrefix(store.Store, "_") {
			httpEnabledStores = append(httpEnabledStores, store)
		}

		storeName := s
		groupURI := "/hooks/" + storeName + "/"
		var lowerGroupURI string
		if lowerStoreName := strings.ToLower(storeName); lowerStoreName != storeName {
			lowerGroupURI = "/hooks/" + lowerStoreName + "/"
		}

		group := e.Group(groupURI)
		lowerGroup := e.Group(lowerGroupURI)
		for i, hook := range store.HTTPHooks {
			if hook.URI == "" {
				log.Error("Empty URI in hook", strconv.Itoa(i), " for "+groupURI+". Will ignored")
				continue
			}
			var handler func(path string, h echo.HandlerFunc, m ...echo.MiddlewareFunc)
			var lowerHandler func(path string, h echo.HandlerFunc, m ...echo.MiddlewareFunc)
			switch hook.Method {
			case "GET", "Get", "get":
				handler = group.GET
				if lowerGroupURI != "" {
					lowerHandler = lowerGroup.GET
				}
			case "POST", "Post", "post":
				handler = group.POST
				if lowerGroupURI != "" {
					lowerHandler = lowerGroup.POST
				}
			case "PUT", "Put", "put":
				handler = group.PUT
				if lowerGroupURI != "" {
					lowerHandler = lowerGroup.PUT
				}
			case "PATCH", "Patch", "patch":
				handler = group.PATCH
				if lowerGroupURI != "" {
					lowerHandler = lowerGroup.PATCH
				}
			case "DELETE", "Delete", "delete":
				handler = group.DELETE
				if lowerGroupURI != "" {
					lowerHandler = lowerGroup.DELETE
				}
			case "HEAD", "Head", "head":
				handler = group.HEAD
				if lowerGroupURI != "" {
					lowerHandler = lowerGroup.HEAD
				}
			case "OPTIONS", "Options", "options":
				handler = group.OPTIONS
				if lowerGroupURI != "" {
					lowerHandler = lowerGroup.OPTIONS
				}
			default:
				log.Warn("UNKNOWN HTTP METHOD. Will use GET method ", hook)
				handler = group.GET
				if lowerGroupURI != "" {
					lowerHandler = lowerGroup.GET
				}
			}

			hookIndex := i
			var hookHandler = func(c echo.Context) error {
				t := taskq.Task{
					Store:  storeName,
					Type:   taskq.HTTPHook,
					UserID: "root",
					Arguments: map[string]interface{}{
						"request":   extractRequest(c),
						"hookIndex": hookIndex,
					},
				}
				_res, err := taskq.PushAndGetResult(&t, 0)
				if err != nil {
					return c.JSON(http.StatusSeeOther, err.Error())
				}

				res, err := parseResult(_res)
				if err != nil {
					return c.JSON(http.StatusInternalServerError, err.Error())
				}

				return defaultResponse(res, c)
			}

			handler(hook.URI, hookHandler)
			log.Infof("Created '%s' httpHook for store '%s' with path %s", hook.Method, storeName, groupURI+hook.URI)
			if lowerHandler != nil {
				lowerHandler(hook.URI, hookHandler)
				log.Infof("Created '%s' httpHook on lower case for store '%s' with path %s", hook.Method, storeName, lowerGroupURI+hook.URI)
			}
		}

		if len(store.Actions) > 0 {
			createHTTPActions(storeName, store.Actions)
		}

		if len(store.StoreActions) > 0 {
			createHTTPActions(storeName, store.StoreActions)
		}

		if store.Type == "file" || store.Type == "files" {
			createFileHandlers(storeName)
		}
	}

	routesBuildingCompleted = true
	log.Info("Routes building complete")

	createRESTAPI(httpEnabledStores)
	log.Info("REST API building complete")

	getPublicRSAKey()
	log.Info("RSA keys received")

}

func createFileHandlers(storeName string) {
	groupURI := "/files/" + storeName
	group := e.Group(groupURI)
	group.POST("/", postFileHandler(storeName), jwtAuthMiddleware(false))
	group.GET("/:id", getFileHandler(storeName), jwtAuthMiddleware(true))
	group.POST("/:id", postFileHandler(storeName), jwtAuthMiddleware(false))
	group.DELETE("/:id", deleteFileHandler(storeName), jwtAuthMiddleware(false))
	log.Infof("Created handlers for fileStore '%s' with path %s:id", storeName, groupURI)
}

func writeFileFromFileStore(c echo.Context, storeName, fileID string) error {
	res, err := http.Get(settings.GetFileStoreAddress() + "/" + storeName + "/" + fileID)
	if err != nil {
		return c.JSON(res.StatusCode, res.Status)
	}
	defer res.Body.Close()
	fileName := res.Header.Get("file-name")
	c.Response().Header().Add("Content-Type", getContentType(fileName))
	c.Response().Header().Set(echo.HeaderContentDisposition, "attachment; filename="+fileName)
	body, _ := ioutil.ReadAll(res.Body)
	_, err = c.Response().Write(body)
	return err
}

func createHTTPActions(storeName string, actions []config.Action) {
	groupURI := "/actions/" + storeName + "/"
	group := e.Group(groupURI)
	for _, v := range actions {
		if v.Type != "http" {
			continue
		}
		actionID := v.ID
		group.GET(actionID, func(c echo.Context) error {
			_cred := c.Get("cred")
			if _cred == nil {
				log.Warn("HTTP ACTION: no cred in echo context")
				return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
			}
			cred, ok := _cred.(credentials)
			if !ok {
				log.Warn("HTTP ACTION: invalid cred in echo context")
				return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
			}

			t := taskq.Task{
				Store:  storeName,
				Type:   taskq.DbAction,
				UserID: cred.userID,
				Arguments: map[string]interface{}{
					"request":  extractRequest(c),
					"actionId": actionID,
				},
			}
			if itemID := c.QueryParam("item-id"); itemID != "" {
				t.Arguments["itemId"] = itemID
			}
			_res, err := taskq.PushAndGetResult(&t, 0)
			if err != nil {
				return c.JSON(http.StatusSeeOther, err.Error())
			}
			res, err := parseResult(_res)
			if err != nil {
				return c.JSON(http.StatusInternalServerError, err.Error())
			}
			return defaultResponse(res, c)
		}, jwtAuthMiddleware(false))
		log.Infof("Registered httpAction for store '%s' with path %s", storeName, groupURI+v.ID)
	}
}

func extractRequest(c echo.Context) map[string]interface{} {
	params := map[string]string{}
	for _, p := range c.ParamNames() {
		params[p] = c.Param(p)
	}
	header := map[string]string{}
	for k, v := range c.Request().Header {
		if len(v) > 0 {
			header[k] = v[0]
		}
	}

	formParams, _ := c.FormParams()
	var data interface{}
	if _data := formParams["data"]; len(_data) > 0 {
		data = _data[0]
	}

	var body interface{}
	bodyBuf := bytes.NewBuffer(nil)
	_, err := io.Copy(bodyBuf, c.Request().Body)
	if err != nil && err != io.EOF {
		log.Errorf("Can't read request http body. Error: %v", err)
	} else {
		if rtype := header["Content-Type"]; strings.HasPrefix(rtype, "application/json") || strings.HasPrefix(rtype, "text/plain") {
			body = bodyBuf.String()
		} else {
			body = base64.StdEncoding.EncodeToString(bodyBuf.Bytes())
		}
	}

	return map[string]interface{}{
		"params":  params,
		"query":   c.QueryParams(),
		"form":    formParams,
		"ip":      extractIP(c),
		"referer": c.Request().Referer(),
		"header":  header,
		"body":    body,
		"data":    data,
	}
}

// Thanks to gin framework for algorithm
// https://github.com/gin-gonic/gin/blob/master/context.go
func extractIP(c echo.Context) string {
	if clientIPHeader, ok := c.Request().Header["X-Forwarded-For"]; ok {
		if xRealIP, ok := c.Request().Header["X-Real-Ip"]; ok {
			clientIP := strings.TrimSpace(xRealIP[0])
			if len(clientIP) > 0 {
				return clientIP
			}
		}

		clientIP := clientIPHeader[0]
		if index := strings.IndexByte(clientIP, ','); index >= 0 {
			clientIP = clientIP[0:index]
		}
		clientIP = strings.TrimSpace(clientIP)
		if len(clientIP) > 0 {
			return clientIP
		}
	}
	if ip, _, err := net.SplitHostPort(strings.TrimSpace(c.Request().RemoteAddr)); err == nil {
		return ip
	}
	return ""
}

func defaultResponse(res *result, c echo.Context) error {
	code := res.Code
	if code == 0 {
		code = http.StatusOK
	}
	for k, v := range res.Header {
		c.Response().Header().Set(k, v)
	}
	switch res.Type {
	case "REDIRECT", "redirect":
		if code == 200 {
			code = http.StatusFound
		}
		return c.Redirect(code, res.Data)
	case "JSON", "json":
		if res.RAWData == nil {
			return c.JSONBlob(code, []byte(res.Data))
		}
		return c.JSON(code, res.RAWData)
	case "HTML", "html":
		return c.HTML(code, res.Data)
	case "XML", "xml":
		return c.XMLBlob(code, []byte(res.Data))
	case "file":
		if res.Store != "" && res.ID != "" {
			return writeFileFromFileStore(c, res.Store, res.ID)
		}
		buffer, err := base64.StdEncoding.DecodeString(res.Data)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, "can't decode file")
		}
		c.Response().Header().Set(echo.HeaderContentDisposition, "attachment; filename="+res.FileName)
		return c.Blob(200, getContentType(res.FileName), buffer)
		// return c.ServeContent(bytes.NewReader(buffer), res.FileName, time.Now())
	default:
		return c.JSON(http.StatusSeeOther, "unknown encoding type")
	}
}

func parseResult(_res interface{}) (*result, error) {
	encoded, err := json.Marshal(_res)
	if err != nil {
		return nil, errors.Wrap(err, "when parse result")
	}
	res := new(result)
	err = json.Unmarshal(encoded, res)
	if err != nil {
		err = errors.Wrap(err, "when unmarshal result")
	}
	return res, err
}

func getFileHandler(storeName string) echo.HandlerFunc {
	return func(c echo.Context) error {
		_cred := c.Get("cred")
		if _cred == nil {
			log.Warn("FILES GET: no cred in echo context")
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		cred, ok := _cred.(credentials)
		if !ok {
			log.Warn("FILES GET: invalid cred in echo context")
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}

		fileID := c.Param("id")
		t := taskq.Task{
			Type:      taskq.DbGet,
			UserID:    cred.userID,
			Store:     storeName,
			Arguments: map[string]interface{}{"_id": fileID},
		}
		_, err := taskq.PushAndGetResult(&t, 0)
		if err != nil {
			return c.JSON(http.StatusBadRequest, err.Error())
		}
		writeFileFromFileStore(c, storeName, fileID)
		return nil
	}
}

func postFileHandler(storeName string) echo.HandlerFunc {
	return func(c echo.Context) error {
		_cred := c.Get("cred")
		if _cred == nil {
			log.Warn("FILE POST: no cred in echo context")
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		cred, ok := _cred.(credentials)
		if !ok {
			log.Warn("FILE POST: invalid cred in echo context")
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}

		fileID := c.Param("id")
		if fileID == "" {
			fileID = uuid.NewV4()
		}
		fileHeader, err := c.FormFile("file")
		if err != nil {
			return c.JSON(http.StatusBadRequest, http.StatusText(http.StatusBadRequest))
		}
		fileName := fileHeader.Filename
		t := taskq.Task{
			Type:      taskq.DbSet,
			UserID:    cred.userID,
			Store:     storeName,
			Arguments: map[string]interface{}{"item": map[string]string{"_id": fileID, "name": fileName}},
		}
		_, err = taskq.PushAndGetResult(&t, 0)
		if err != nil {
			return c.JSON(http.StatusBadRequest, err.Error())
		}
		file, err := fileHeader.Open()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, err.Error())
		}
		defer file.Close()

		req, err := http.NewRequest(http.MethodPost, settings.GetFileStoreAddress()+"/"+storeName+"/"+fileID, file)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, err.Error())
		}
		req.Header.Set("file-name", fileName)
		client := &http.Client{}
		_, err = client.Do(req)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, err.Error())
		}
		return c.JSON(http.StatusOK, fileID)
	}
}

func deleteFileHandler(storeName string) echo.HandlerFunc {
	return func(c echo.Context) error {
		_cred := c.Get("cred")
		if _cred == nil {
			log.Warn("FILES DELETE: no cred in echo context")
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		cred, ok := _cred.(credentials)
		if !ok {
			log.Warn("FILES DELETE: invalid cred in echo context")
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}

		fileID := c.Param("id")
		t := taskq.Task{
			Type:      taskq.DbDelete,
			UserID:    cred.userID,
			Store:     storeName,
			Arguments: map[string]interface{}{"item": map[string]string{"_id": fileID}},
		}
		_, err := taskq.PushAndGetResult(&t, 0)
		if err != nil {
			return c.JSON(http.StatusBadRequest, err.Error())
		}
		// we don't delete files from file store for now
		return c.JSON(http.StatusOK, nil)
	}
}
