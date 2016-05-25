package internet

import (
	"encoding/json"
	"net/http"
	"strconv"
	"sync"

	log "github.com/Sirupsen/logrus"
	"github.com/ivahaev/go-logger"
	"github.com/labstack/echo"
	"github.com/pkg/errors"

	"github.com/getblank/blank-router/config"
	"github.com/getblank/blank-router/taskq"
)

var (
	routesBuildingCompleted bool
	routesMutex             sync.Mutex
)

type result struct {
	Encoding string      `json:"encoding"`
	Data     string      `json:"data"`
	RAWData  interface{} `json:"rawData"`
	Code     int         `json:"code"`
}

func httpHookHandler(c echo.Context) error {
	logger.Debug(c.Param("store"), c.ParamValues(), c.Request().Method())
	var params = c.ParamValues()
	if len(params) == 1 {
		return c.JSON(http.StatusBadRequest, "no params")
	}
	c.String(http.StatusOK, "!!!")
	return nil
}

func onConfigUpdate(c map[string]config.Store) {
	if routesBuildingCompleted {
		log.Warn("Routes already built. Need to restart if http hooks or actions modified.")
	}
	for s, store := range c {
		storeName := s
		groupUri := "/hooks/" + storeName + "/"
		group := e.Group(groupUri)
		for i, hook := range store.HTTPHooks {
			if hook.URI == "" {
				logger.Error("Empty URI in hook", strconv.Itoa(i), " for "+groupUri+". Will ignored")
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
				params := map[string]string{}
				for _, p := range c.ParamNames() {
					params[p] = c.Param(p)
				}
				t := taskq.Task{
					Store:  storeName,
					Type:   taskq.HTTPHook,
					UserID: "root",
					Arguments: map[string]interface{}{
						"request": map[string]interface{}{
							"params": params,
						},
						"hookIndex": hookIndex,
					},
				}
				_res, err := taskq.PushAndGetResult(t)
				if err != nil {
					return c.JSON(http.StatusSeeOther, err.Error())
				}
				res, err := parseResult(_res)
				if err != nil {
					return c.JSON(http.StatusInternalServerError, err.Error())
				}
				code := res.Code
				if code == 0 {
					code = http.StatusOK
				}
				switch res.Encoding {
				case "JSON", "json":
					response := res.RAWData
					if response == nil {
						response = res.Data
					}
					return c.JSON(code, response)
				case "HTML", "html":
					return c.HTML(code, res.Data)
				case "XML", "xml":
					return c.XML(code, res.Data)
				default:
					return c.JSON(http.StatusSeeOther, "unknown encoding type")
				}
			})
			log.Infof("Created '%s' httpHook for store '%s' with path %s", hook.Method, storeName, groupUri+hook.URI)
		}
	}
	routesBuildingCompleted = true
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
