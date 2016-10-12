package internet

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	log "github.com/Sirupsen/logrus"
	"github.com/labstack/echo"

	"github.com/getblank/blank-router/berrors"
	"github.com/getblank/blank-router/config"
	"github.com/getblank/blank-router/taskq"
	"github.com/getblank/uuid"
)

func createRESTAPI(httpEnabledStores []config.Store) {
	if len(httpEnabledStores) > 0 {
		t := taskq.Task{
			Type:   taskq.DbAction,
			Store:  "_serverSettings",
			UserID: "root",
			Arguments: map[string]interface{}{
				"actionId": "restdoc",
				"data":     httpEnabledStores,
			},
		}
		res, err := taskq.PushAndGetResult(&t, 0)
		if err != nil {
			log.WithError(err).Error("Can't compile REST docs")
			return
		}
		html, ok := res.(string)
		if !ok {
			log.WithField("html", res).Error("Invalid response type from doc compiler")
			return
		}
		e.GET(apiV1baseURI[:len(apiV1baseURI)-1], func(c echo.Context) error {
			return c.HTML(http.StatusOK, html)
		})
		log.Info("REST API Documentation generated")
	}
	for _, store := range httpEnabledStores {
		createRESTAPIForStore(store)
	}
}

func createRESTAPIForStore(store config.Store) {
	baseURI := apiV1baseURI + store.Store
	lowerBaseURI := strings.ToLower(baseURI)

	e.GET(baseURI, restGetAllDocumentsHandler(store.Store), allowAnyOriginMiddleware(), jwtAuthMiddleware(false))
	log.WithFields(log.Fields{"store": store.Store}).Infof("Created GET all REST method %s", baseURI)
	if baseURI != lowerBaseURI {
		e.GET(lowerBaseURI, restGetAllDocumentsHandler(store.Store), allowAnyOriginMiddleware(), jwtAuthMiddleware(false))
		log.WithFields(log.Fields{"store": store.Store}).Infof("Created GET all REST method %s", lowerBaseURI)
	}

	e.POST(baseURI, restPostDocumentHandler(store.Store), allowAnyOriginMiddleware(), jwtAuthMiddleware(false))
	log.WithFields(log.Fields{"store": store.Store}).Infof("Created POST REST method %s", baseURI)
	if baseURI != lowerBaseURI {
		e.POST(lowerBaseURI, restPostDocumentHandler(store.Store), allowAnyOriginMiddleware(), jwtAuthMiddleware(false))
		log.WithFields(log.Fields{"store": store.Store}).Infof("Created POST REST method %s", lowerBaseURI)
	}

	itemURI := baseURI + "/:id"
	lowerItemURI := lowerBaseURI + "/:id"
	e.GET(itemURI, restGetDocumentHandler(store.Store), allowAnyOriginMiddleware(), jwtAuthMiddleware(false))
	log.WithFields(log.Fields{"store": store.Store}).Infof("Created GET REST method %s", itemURI)
	if itemURI != lowerItemURI {
		e.GET(lowerItemURI, restGetDocumentHandler(store.Store), allowAnyOriginMiddleware(), jwtAuthMiddleware(false))
		log.WithFields(log.Fields{"store": store.Store}).Infof("Created GET REST method %s", lowerItemURI)
	}
	e.PUT(itemURI, restPutDocumentHandler(store.Store), allowAnyOriginMiddleware(), jwtAuthMiddleware(false))
	log.WithFields(log.Fields{"store": store.Store}).Infof("Created PUT REST method %s", itemURI)
	if itemURI != lowerItemURI {
		e.PUT(lowerItemURI, restPutDocumentHandler(store.Store), allowAnyOriginMiddleware(), jwtAuthMiddleware(false))
		log.WithFields(log.Fields{"store": store.Store}).Infof("Created PUT REST method %s", lowerItemURI)
	}
	e.DELETE(itemURI, restDeleteDocumentHandler(store.Store), allowAnyOriginMiddleware(), jwtAuthMiddleware(false))
	log.WithFields(log.Fields{"store": store.Store}).Infof("Created DELETE REST method %s", itemURI)
	if itemURI != lowerItemURI {
		e.DELETE(lowerItemURI, restDeleteDocumentHandler(store.Store), allowAnyOriginMiddleware(), jwtAuthMiddleware(false))
		log.WithFields(log.Fields{"store": store.Store}).Infof("Created DELETE REST method %s", lowerItemURI)
	}

	for _, a := range store.Actions {
		actionURI := itemURI + "/" + a.ID
		lowerActionURI := lowerItemURI + "/" + a.ID
		e.POST(actionURI, restActionHandler(store.Store, a.ID), allowAnyOriginMiddleware(), jwtAuthMiddleware(false))
		log.WithFields(log.Fields{"store": store.Store}).Infof("Created POST action REST method %s", actionURI)
		if actionURI != lowerActionURI {
			e.POST(lowerActionURI, restActionHandler(store.Store, a.ID), allowAnyOriginMiddleware(), jwtAuthMiddleware(false))
			log.WithFields(log.Fields{"store": store.Store}).Infof("Created POST action REST method %s", lowerActionURI)
		}
	}
	for _, a := range store.StoreActions {
		actionURI := baseURI + "/" + a.ID
		lowerActionURI := lowerBaseURI + "/" + a.ID
		e.POST(actionURI, restActionHandler(store.Store, a.ID), allowAnyOriginMiddleware(), jwtAuthMiddleware(false))
		log.WithFields(log.Fields{"store": store.Store}).Infof("Created POST storeAction REST method %s", actionURI)
		if actionURI != lowerActionURI {
			e.POST(lowerActionURI, restActionHandler(store.Store, a.ID), allowAnyOriginMiddleware(), jwtAuthMiddleware(false))
			log.WithFields(log.Fields{"store": store.Store}).Infof("Created POST storeAction REST method %s", lowerActionURI)
		}
	}
}

func restActionHandler(storeName, actionID string) echo.HandlerFunc {
	return func(c echo.Context) error {
		_cred := c.Get("cred")
		if _cred == nil {
			log.Warn("REST ACTION: no cred in echo context")
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		cred, ok := _cred.(credentials)
		if !ok {
			log.Warn("REST ACTION: invalid cred in echo context")
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		t := taskq.Task{
			Type:   taskq.DbAction,
			Store:  storeName,
			UserID: cred.userID,
			Arguments: map[string]interface{}{
				"itemId":   c.Param("id"),
				"actionId": actionID,
				"request":  extractRequest(c),
			},
		}
		if c.Request().ContentLength() != 0 {
			var data interface{}
			err := c.Bind(&data)
			if err != nil {
				return c.JSON(http.StatusBadRequest, err.Error())
			}
			t.Arguments["data"] = data
		}
		res, err := taskq.PushAndGetResult(&t, time.Second*30)
		if err != nil {
			if strings.EqualFold(err.Error(), "not found") {
				return c.JSON(http.StatusNotFound, err.Error())
			}
			return c.JSON(http.StatusSeeOther, err.Error())
		}
		return c.JSON(http.StatusOK, res)
	}
}

func restGetAllDocumentsHandler(storeName string) echo.HandlerFunc {
	return func(c echo.Context) error {
		_cred := c.Get("cred")
		if _cred == nil {
			log.Warn("REST GETALL: no cred in echo context")
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		cred, ok := _cred.(credentials)
		if !ok {
			log.Warn("REST GETALL: invalid cred in echo context")
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		var query map[string]interface{}
		if _query := c.QueryParam("query"); _query != "" {
			err := json.Unmarshal([]byte(_query), &query)
			if err != nil {
				return c.JSON(http.StatusBadRequest, err.Error())
			}
		}
		findQuery := map[string]interface{}{"query": query, "skip": 0, "take": 10}
		if _skip := c.QueryParam("skip"); _skip != "" {
			var skip int
			skip, err := strconv.Atoi(_skip)
			if err != nil {
				return c.JSON(http.StatusBadRequest, err.Error())
			}
			findQuery["skip"] = skip
		}
		if _take := c.QueryParam("take"); _take != "" {
			var take int
			take, err := strconv.Atoi(_take)
			if err != nil {
				return c.JSON(http.StatusBadRequest, err.Error())
			}
			findQuery["take"] = take
		}
		if orderBy := c.QueryParam("orderBy"); orderBy != "" {
			findQuery["orderBy"] = orderBy
		}
		t := taskq.Task{
			Type:   taskq.DbFind,
			UserID: cred.userID,
			Store:  storeName,
			Arguments: map[string]interface{}{
				"query": findQuery,
			},
		}
		res, err := taskq.PushAndGetResult(&t, time.Second*30)
		if err != nil {
			if strings.EqualFold(err.Error(), "not found") {
				return c.JSON(http.StatusNotFound, err.Error())
			}
			return c.JSON(http.StatusSeeOther, err.Error())
		}
		return c.JSON(http.StatusOK, res)
	}
}

func restGetDocumentHandler(storeName string) echo.HandlerFunc {
	return func(c echo.Context) error {
		_cred := c.Get("cred")
		if _cred == nil {
			log.Warn("REST GET: no cred in echo context")
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		cred, ok := _cred.(credentials)
		if !ok {
			log.Warn("REST GET: invalid cred in echo context")
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		id := c.Param("id")
		if id == "" {
			return c.JSON(http.StatusBadRequest, http.StatusText(http.StatusBadRequest))
		}
		t := taskq.Task{
			Type:   taskq.DbGet,
			UserID: cred.userID,
			Store:  storeName,
			Arguments: map[string]interface{}{
				"_id": id,
			},
		}
		res, err := taskq.PushAndGetResult(&t, time.Second*30)
		if err != nil {
			if strings.EqualFold(err.Error(), "not found") {
				return c.JSON(http.StatusNotFound, err.Error())
			}
			return c.JSON(http.StatusSeeOther, err.Error())
		}
		return c.JSON(http.StatusOK, res)
	}
}

func restPostDocumentHandler(storeName string) echo.HandlerFunc {
	return func(c echo.Context) error {
		_cred := c.Get("cred")
		if _cred == nil {
			log.Warn("REST POST: no cred in echo context")
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		cred, ok := _cred.(credentials)
		if !ok {
			log.Warn("REST POST: invalid cred in echo context")
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		var item map[string]interface{}
		err := c.Bind(&item)
		if err != nil {
			return c.JSON(http.StatusBadRequest, err.Error())
		}
		if item["_id"] == nil {
			item["_id"] = uuid.NewV4()
		}
		t := taskq.Task{
			Type:   taskq.DbSet,
			UserID: cred.userID,
			Store:  storeName,
			Arguments: map[string]interface{}{
				"item": item,
			},
		}
		res, err := taskq.PushAndGetResult(&t, time.Second*30)
		if err != nil {
			return c.JSON(http.StatusSeeOther, err.Error())
		}
		item, ok = res.(map[string]interface{})
		if !ok {
			return c.JSON(http.StatusInternalServerError, berrors.ErrError.Error())
		}
		return c.JSON(http.StatusCreated, item["_id"])
	}
}

func restPutDocumentHandler(storeName string) echo.HandlerFunc {
	return func(c echo.Context) error {
		_cred := c.Get("cred")
		if _cred == nil {
			log.Warn("REST PUT: no cred in echo context")
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		cred, ok := _cred.(credentials)
		if !ok {
			log.Warn("REST PUT: invalid cred in echo context")
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		id := c.Param("id")
		if id == "" {
			return c.JSON(http.StatusBadRequest, http.StatusText(http.StatusBadRequest))
		}
		var item map[string]interface{}
		err := c.Bind(&item)
		if err != nil {
			return c.JSON(http.StatusBadRequest, err.Error())
		}
		item["_id"] = id
		t := taskq.Task{
			Type:   taskq.DbSet,
			UserID: cred.userID,
			Store:  storeName,
			Arguments: map[string]interface{}{
				"item": item,
			},
		}
		_, err = taskq.PushAndGetResult(&t, time.Second*30)
		if err != nil {
			return c.JSON(http.StatusSeeOther, err.Error())
		}
		return c.JSON(http.StatusOK, http.StatusText(http.StatusOK))
	}
}

func restDeleteDocumentHandler(storeName string) echo.HandlerFunc {
	return func(c echo.Context) error {
		_cred := c.Get("cred")
		if _cred == nil {
			log.Warn("REST DELETE: no cred in echo context")
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		cred, ok := _cred.(credentials)
		if !ok {
			log.Warn("REST DELETE: invalid cred in echo context")
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		id := c.Param("id")
		if id == "" {
			return c.JSON(http.StatusBadRequest, http.StatusText(http.StatusBadRequest))
		}
		t := taskq.Task{
			Type:   taskq.DbDelete,
			UserID: cred.userID,
			Store:  storeName,
			Arguments: map[string]interface{}{
				"_id": id,
			},
		}
		_, err := taskq.PushAndGetResult(&t, time.Second*30)
		if err != nil {
			if strings.EqualFold(err.Error(), "not found") {
				return c.JSON(http.StatusNotFound, err.Error())
			}
			return c.JSON(http.StatusSeeOther, err.Error())
		}
		return c.JSON(http.StatusOK, http.StatusText(http.StatusOK))
	}
}
