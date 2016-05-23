package intranet

import (
	"errors"
	"net/http"

	log "github.com/Sirupsen/logrus"
	"github.com/getblank/wango"
	"golang.org/x/net/websocket"

	"github.com/getblank/blank-router/berrors"
	"github.com/getblank/blank-router/taskq"
)

const (
	getTaskURI   = "get"
	doneTaskURI  = "done"
	errorTaskURI = "error"
	publishURI   = "publish"
	cronRunURI   = "cron.run"
)

func taskGetHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	t := taskq.Shift()
	if c.Connected() {
		return t, nil
	}

	taskq.UnShift(t)
	return nil, nil
}

func taskDoneHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	if len(args) < 2 {
		log.WithField("argumentsLength", len(args)).Warn("Invalid task.done RPC")
		return nil, berrors.ErrInvalidArguments
	}
	id, ok := args[0].(float64)
	if !ok {
		log.WithField("taskId", args[0]).Warn("Invalid task.id in task.done RPC")
		return nil, berrors.ErrInvalidArguments
	}

	result := taskq.Result{
		ID:     int(id),
		Result: args[1],
	}
	taskq.Done(result)
	return nil, nil
}

func taskErrorHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	if len(args) < 2 {
		log.WithField("argumentsLength", len(args)).Warn("Invalid task.error RPC")
		return nil, berrors.ErrInvalidArguments
	}
	id, ok := args[0].(float64)
	if !ok {
		log.WithField("taskId", args[0]).Warn("Invalid task.id in task.error RPC")
		return nil, berrors.ErrInvalidArguments
	}
	err, ok := args[1].(string)
	if !ok {
		log.WithField("error", args[1]).Warn("Invalid description in task.error RPC")
		return nil, berrors.ErrInvalidArguments
	}
	result := taskq.Result{
		ID:  int(id),
		Err: err,
	}
	taskq.Done(result)
	return nil, nil
}

func cronRunHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	log.Info(uri, args)
	if len(args) < 2 {
		log.WithField("argumentsLength", len(args)).Warn("Invalid cron.run RPC")
		return nil, berrors.ErrInvalidArguments
	}
	storeName, ok := args[0].(string)
	if !ok {
		log.WithField("storeName", args[0]).Warn("Invalid storeName when cron.run RPC")
		return nil, berrors.ErrInvalidArguments
	}
	index, ok := args[1].(float64)
	if !ok {
		log.WithField("index", args[1]).Warn("Invalid task index when cron.run RPC")
		return nil, berrors.ErrInvalidArguments
	}
	t := taskq.Task{
		Type:   taskq.ScheduledScript,
		Store:  storeName,
		UserID: "system",
		Arguments: map[string]interface{}{
			"taskIndex": index,
		},
	}
	resChan := taskq.Push(t)

	res := <-resChan
	if res.Err != "" {
		return nil, errors.New(res.Err)
	}
	return res.Result, nil
}

func internalOpenCallback(c *wango.Conn) {
	println("Connected client", c.ID())
}

func internalCloseCallback(c *wango.Conn) {

}

// args: uri string, event interface{}, subscribers array of connIDs
// This data will be transferred sent as event on "events" topic
func publishHandler(c *wango.Conn, _uri string, args ...interface{}) (interface{}, error) {
	uri, ok := args[0].(string)
	if !ok {
		return nil, berrors.ErrInvalidArguments
	}
	_subscribers, ok := args[2].([]interface{})
	if !ok {
		return nil, berrors.ErrInvalidArguments
	}
	subscribers := make([]string, len(_subscribers))
	for k, v := range _subscribers {
		connID, ok := v.(string)
		if !ok {
			log.WithField("connID", connID).Warn("ConnID is not a string in 'publish' RPC call")
			continue
		}
		subscribers[k] = connID
	}
	onEventHandler(uri, args[1], subscribers)

	return nil, nil
}

func runServer() {
	wamp := wango.New()
	wamp.SetSessionOpenCallback(internalOpenCallback)
	wamp.SetSessionCloseCallback(internalCloseCallback)

	wamp.RegisterRPCHandler(getTaskURI, taskGetHandler)
	wamp.RegisterRPCHandler(doneTaskURI, taskDoneHandler)
	wamp.RegisterRPCHandler(errorTaskURI, taskErrorHandler)
	wamp.RegisterRPCHandler(publishURI, publishHandler)
	wamp.RegisterRPCHandler(cronRunURI, cronRunHandler)

	s := new(websocket.Server)
	s.Handshake = func(c *websocket.Config, r *http.Request) error {
		return nil
	}
	s.Handler = func(ws *websocket.Conn) {
		wamp.WampHandler(ws, nil)
	}
	http.Handle("/", s)

	err := http.ListenAndServe(":2345", nil)
	if err != nil {
		panic("ListenAndServe: " + err.Error())
	}
}
