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
		res, err := taskq.PushAndGetResult(t, 0)
		if err != nil {
			log.WithError(err).Error("Can't compile REST docs")
			return
		}
		html, ok := res.(string)
		if !ok {
			log.WithField("html", res).Error("Invalid response type from doc compiler")
			return
		}
		e.Get(apiV1baseURI, func(c echo.Context) error {
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

	e.Get(baseURI, getAllDocumentsHandler(store.Store))
	if baseURI != lowerBaseURI {
		e.Get(lowerBaseURI, getAllDocumentsHandler(store.Store))
	}

	e.Post(baseURI, postDocumentHandler(store.Store))
	if baseURI != lowerBaseURI {
		e.Post(lowerBaseURI, postDocumentHandler(store.Store))
	}

	itemURI := baseURI + "/:id"
	lowerItemURI := lowerBaseURI + "/:id"
	e.Get(itemURI, getDocumentHandler(store.Store))
	if itemURI != lowerItemURI {
		e.Get(lowerItemURI, getDocumentHandler(store.Store))
	}
	e.Put(itemURI, putDocumentHandler(store.Store))
	if itemURI != lowerItemURI {
		e.Put(lowerItemURI, putDocumentHandler(store.Store))
	}
	e.Delete(itemURI, deleteDocumentHandler(store.Store))
	if itemURI != lowerItemURI {
		e.Delete(lowerItemURI, deleteDocumentHandler(store.Store))
	}
}

func getAllDocumentsHandler(storeName string) echo.HandlerFunc {
	return func(c echo.Context) error {
		userID, err := getUserID(c)
		if err != nil {
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		var query map[string]interface{}
		if _query := c.QueryParam("query"); _query != "" {
			err = json.Unmarshal([]byte(_query), &query)
			if err != nil {
				return c.JSON(http.StatusBadRequest, err.Error())
			}
		}
		findQuery := map[string]interface{}{"query": query, "skip": 0, "take": 10}
		if _skip := c.QueryParam("skip"); _skip != "" {
			skip, err := strconv.Atoi(_skip)
			if err != nil {
				return c.JSON(http.StatusBadRequest, err.Error())
			}
			findQuery["skip"] = skip
		}
		if _take := c.QueryParam("take"); _take != "" {
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
			UserID: userID,
			Store:  storeName,
			Arguments: map[string]interface{}{
				"query": findQuery,
			},
		}
		res, err := taskq.PushAndGetResult(t, time.Second*30)
		if err != nil {
			if strings.EqualFold(err.Error(), "not found") {
				return c.JSON(http.StatusNotFound, err.Error())
			}
			return c.JSON(http.StatusSeeOther, err.Error())
		}
		return c.JSON(http.StatusOK, res)
	}
}

func getDocumentHandler(storeName string) echo.HandlerFunc {
	return func(c echo.Context) error {
		userID, err := getUserID(c)
		if err != nil {
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		id := c.Param("id")
		if id == "" {
			return c.JSON(http.StatusBadRequest, http.StatusText(http.StatusBadRequest))
		}
		t := taskq.Task{
			Type:   taskq.DbGet,
			UserID: userID,
			Store:  storeName,
			Arguments: map[string]interface{}{
				"_id": id,
			},
		}
		res, err := taskq.PushAndGetResult(t, time.Second*30)
		if err != nil {
			if strings.EqualFold(err.Error(), "not found") {
				return c.JSON(http.StatusNotFound, err.Error())
			}
			return c.JSON(http.StatusSeeOther, err.Error())
		}
		return c.JSON(http.StatusOK, res)
	}
}

func postDocumentHandler(storeName string) echo.HandlerFunc {
	return func(c echo.Context) error {
		userID, err := getUserID(c)
		if err != nil {
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		var item map[string]interface{}
		err = c.Bind(&item)
		if err != nil {
			return c.JSON(http.StatusBadRequest, err.Error())
		}
		if item["_id"] == nil {
			item["_id"] = uuid.NewV4()
		}
		t := taskq.Task{
			Type:   taskq.DbSet,
			UserID: userID,
			Store:  storeName,
			Arguments: map[string]interface{}{
				"item": item,
			},
		}
		res, err := taskq.PushAndGetResult(t, time.Second*30)
		if err != nil {
			return c.JSON(http.StatusSeeOther, err.Error())
		}
		item, ok := res.(map[string]interface{})
		if !ok {
			return c.JSON(http.StatusInternalServerError, berrors.ErrError.Error())
		}
		return c.JSON(http.StatusCreated, item["_id"])
	}
}

func putDocumentHandler(storeName string) echo.HandlerFunc {
	return func(c echo.Context) error {
		userID, err := getUserID(c)
		if err != nil {
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		id := c.Param("id")
		if id == "" {
			return c.JSON(http.StatusBadRequest, http.StatusText(http.StatusBadRequest))
		}
		var item map[string]interface{}
		err = c.Bind(&item)
		if err != nil {
			return c.JSON(http.StatusBadRequest, err.Error())
		}
		item["_id"] = id
		t := taskq.Task{
			Type:   taskq.DbSet,
			UserID: userID,
			Store:  storeName,
			Arguments: map[string]interface{}{
				"item": item,
			},
		}
		_, err = taskq.PushAndGetResult(t, time.Second*30)
		if err != nil {
			return c.JSON(http.StatusSeeOther, err.Error())
		}
		return c.JSON(http.StatusOK, http.StatusText(http.StatusOK))
	}
}

func deleteDocumentHandler(storeName string) echo.HandlerFunc {
	return func(c echo.Context) error {
		userID, err := getUserID(c)
		if err != nil {
			return c.JSON(http.StatusForbidden, http.StatusText(http.StatusForbidden))
		}
		id := c.Param("id")
		if id == "" {
			return c.JSON(http.StatusBadRequest, http.StatusText(http.StatusBadRequest))
		}
		t := taskq.Task{
			Type:   taskq.DbDelete,
			UserID: userID,
			Store:  storeName,
			Arguments: map[string]interface{}{
				"_id": id,
			},
		}
		_, err = taskq.PushAndGetResult(t, time.Second*30)
		if err != nil {
			if strings.EqualFold(err.Error(), "not found") {
				return c.JSON(http.StatusNotFound, err.Error())
			}
			return c.JSON(http.StatusSeeOther, err.Error())
		}
		return c.JSON(http.StatusOK, http.StatusText(http.StatusOK))
	}
}
