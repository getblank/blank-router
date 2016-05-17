package intranet

import (
	"net/http"

	"github.com/getblank/blank-router/taskq"
	"github.com/getblank/wango"
	"golang.org/x/net/websocket"
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
	return nil, nil
}

func taskErrorHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
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
