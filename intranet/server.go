package intranet

import (
	"net/http"

	log "github.com/Sirupsen/logrus"
	"github.com/getblank/wango"
	"golang.org/x/net/websocket"

	"github.com/getblank/blank-router/berrors"
	"github.com/getblank/blank-router/taskq"
)

const (
	getTask   = "get"
	doneTask  = "done"
	errorTask = "error"
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

func internalOpenCallback(c *wango.Conn) {
	println("Connected client", c.ID())
}

func internalCloseCallback(c *wango.Conn) {

}

func runServer() {
	wamp := wango.New()
	wamp.SetSessionOpenCallback(internalOpenCallback)
	wamp.SetSessionCloseCallback(internalCloseCallback)

	wamp.RegisterRPCHandler(getTask, taskGetHandler)
	wamp.RegisterRPCHandler(doneTask, taskDoneHandler)
	wamp.RegisterRPCHandler(errorTask, taskErrorHandler)

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
