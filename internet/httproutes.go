package internet

import (
	"encoding/json"
	"io/ioutil"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	log "github.com/Sirupsen/logrus"
	"github.com/labstack/echo"
	"github.com/pkg/errors"

	"github.com/getblank/blank-router/config"
	"github.com/getblank/blank-router/intranet"
	"github.com/getblank/blank-router/settings"
	"github.com/getblank/blank-router/taskq"
)

var (
	routesBuildingCompleted bool
	routesMutex             sync.Mutex
	errUserIDNotFound       = errors.New("not found")
)

type result struct {
	Type    string      `json:"type"`
	Data    string      `json:"data"`
	RAWData interface{} `json:"rawData"`
	Code    int         `json:"code"`
}

func onConfigUpdate(c map[string]config.Store) {
	if routesBuildingCompleted {
		log.Warn("Routes already built. Need to restart if http hooks or actions modified.")
	}
	for s, store := range c {
		storeName := s
		groupURI := "/hooks/" + storeName + "/"
		group := e.Group(groupURI)
		for i, hook := range store.HTTPHooks {
			if hook.URI == "" {
				log.Error("Empty URI in hook", strconv.Itoa(i), " for "+groupURI+". Will ignored")
				continue
			}
			var handler func(path string, h echo.HandlerFunc, m ...echo.MiddlewareFunc)
			switch hook.Method {
			case "GET", "Get", "get":
				handler = group.GET
			case "POST", "Post", "post":
				handler = group.POST
			case "PUT", "Put", "put":
				handler = group.PUT
			case "PATCH", "Patch", "patch":
				handler = group.PATCH
			case "DELETE", "Delete", "delete":
				handler = group.DELETE
			case "HEAD", "Head", "head":
				handler = group.HEAD
			case "OPTIONS", "Options", "options":
				handler = group.OPTIONS
			default:
				log.Error("UNKNOWN HTTP METHOD", hook)
				continue
			}
			hookIndex := i
			handler(hook.URI, func(c echo.Context) error {
				t := taskq.Task{
					Store:  storeName,
					Type:   taskq.HTTPHook,
					UserID: "root",
					Arguments: map[string]interface{}{
						"request":   extractRequest(c),
						"hookIndex": hookIndex,
					},
				}
				timeout := time.Hour
				if settings.DevMode {
					timeout = time.Second * 10
				}
				_res, err := taskq.PushAndGetResult(t, timeout)
				if err != nil {
					return c.JSON(http.StatusSeeOther, err.Error())
				}
				res, err := parseResult(_res)
				if err != nil {
					return c.JSON(http.StatusInternalServerError, err.Error())
				}
				return defaultResponse(res, c)
			})
			log.Infof("Created '%s' httpHook for store '%s' with path %s", hook.Method, storeName, groupURI+hook.URI)
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
}

func createFileHandlers(storeName string) {
	groupURI := "/files/" + storeName + "/"
	group := e.Group(groupURI)
	group.GET(":id", func(c echo.Context) error {
		userID, err := getUserID(c)
		if err != nil {
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		fileID := c.Param("id")
		t := taskq.Task{
			Type:      taskq.DbGet,
			UserID:    userID,
			Store:     storeName,
			Arguments: map[string]interface{}{"_id": fileID},
		}
		_, err = taskq.PushAndGetResult(t, time.Second*5)
		if err != nil {
			return c.JSON(http.StatusBadRequest, err.Error())
		}

		res, err := http.Get(settings.GetFileStoreAddress() + "/" + storeName + "/" + fileID)
		if err != nil {
			return c.JSON(res.StatusCode, res.Status)
		}
		defer res.Body.Close()
		fileName := res.Header.Get("file-name")
		c.Response().Header().Add("Content-Disposition", `attachment; filename="`+fileName+`"`)
		c.Response().Header().Add("Content-Type", getContentType(fileName))
		body, _ := ioutil.ReadAll(res.Body)
		c.Response().Write(body)
		return nil
	})

	group.POST(":id", func(c echo.Context) error {
		userID, err := getUserID(c)
		if err != nil {
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		fileID := c.Param("id")
		fileHeader, err := c.FormFile("file")
		if err != nil {
			return c.JSON(http.StatusBadRequest, http.StatusText(http.StatusBadRequest))
		}
		fileName := fileHeader.Filename
		t := taskq.Task{
			Type:      taskq.DbSet,
			UserID:    userID,
			Store:     storeName,
			Arguments: map[string]interface{}{"item": map[string]string{"_id": fileID, "name": fileName}},
		}
		_, err = taskq.PushAndGetResult(t, time.Second*5)
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
			// error handling
		}
		return c.JSON(http.StatusOK, nil)
	})

	group.DELETE(":id", func(c echo.Context) error {
		userID, err := getUserID(c)
		if err != nil {
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		fileID := c.Param("id")
		t := taskq.Task{
			Type:      taskq.DbDelete,
			UserID:    userID,
			Store:     storeName,
			Arguments: map[string]interface{}{"item": map[string]string{"_id": fileID}},
		}
		_, err = taskq.PushAndGetResult(t, time.Second*5)
		if err != nil {
			return c.JSON(http.StatusBadRequest, err.Error())
		}
		// we don't delete files from file store for now
		return c.JSON(http.StatusOK, nil)
	})
	log.Infof("Created handlers for fileStore '%s' with path %s:id", storeName, groupURI)
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
			userID, err := getUserID(c)
			if err != nil {
				return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
			}

			t := taskq.Task{
				Store:  storeName,
				Type:   taskq.DbAction,
				UserID: userID,
				Arguments: map[string]interface{}{
					"request":  extractRequest(c),
					"actionId": actionID,
				},
			}
			timeout := time.Hour
			if settings.DevMode {
				timeout = time.Second * 10
			}
			_res, err := taskq.PushAndGetResult(t, timeout)
			if err != nil {
				return c.JSON(http.StatusSeeOther, err.Error())
			}
			res, err := parseResult(_res)
			if err != nil {
				return c.JSON(http.StatusInternalServerError, err.Error())
			}
			return defaultResponse(res, c)
		})
		log.Infof("Registered httpAction for store '%s' with path %s", storeName, groupURI+v.ID)
	}
}

func getUserID(c echo.Context) (string, error) {
	apiKey := c.QueryParam("key")
	if apiKey == "" {
		return "", errUserIDNotFound
	}
	return intranet.CheckSession(apiKey)
}

func extractRequest(c echo.Context) map[string]interface{} {
	params := map[string]string{}
	for _, p := range c.ParamNames() {
		params[p] = c.Param(p)
	}
	header := map[string]string{}
	for _, k := range c.Request().Header().Keys() {
		header[k] = c.Request().Header().Get(k)
	}
	return map[string]interface{}{
		"params":  params,
		"query":   c.QueryParams(),
		"form":    c.FormParams(),
		"ip":      extractIP(c),
		"referer": c.Request().Referer(),
		"header":  header,
	}
}

// Thanks to gin framework for algorithm
// https://github.com/gin-gonic/gin/blob/master/context.go
func extractIP(c echo.Context) string {
	if c.Request().Header().Contains("X-Forwarded-For") {
		clientIP := strings.TrimSpace(c.Request().Header().Get("X-Real-Ip"))
		if len(clientIP) > 0 {
			return clientIP
		}
		clientIP = c.Request().Header().Get("X-Forwarded-For")
		if index := strings.IndexByte(clientIP, ','); index >= 0 {
			clientIP = clientIP[0:index]
		}
		clientIP = strings.TrimSpace(clientIP)
		if len(clientIP) > 0 {
			return clientIP
		}
	}
	if ip, _, err := net.SplitHostPort(strings.TrimSpace(c.Request().RemoteAddress())); err == nil {
		return ip
	}
	return ""
}

func defaultResponse(res *result, c echo.Context) error {
	code := res.Code
	if code == 0 {
		code = http.StatusOK
	}
	switch res.Type {
	case "JSON", "json":
		response := res.RAWData
		if response == nil {
			response = res.Data
		}
		return c.JSON(code, response)
	case "HTML", "html":
		return c.HTML(code, res.Data)
	case "XML", "xml":
		return c.XMLBlob(code, []byte(res.Data))
	case "file":
		return c.File(res.Data)
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
