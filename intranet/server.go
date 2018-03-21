package intranet

import (
	"errors"
	"net/http"
	"os"
	"strings"

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
	uriSubStores = "com.stores"
)

var (
	wampServer           = wango.New()
	taskWatchChan        = make(chan taskKeeper, 1000)
	workerConnectChan    = make(chan string)
	workerDisconnectChan = make(chan string)
	listeningPort        = "2345"
)

type taskKeeper struct {
	workerID string
	taskID   uint64
	done     bool
}

func taskGetHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	log.Debugf("Get task request from client \"%s\"", c.ID())
	t := taskq.Shift()
	log.Debugf("Shifted task id: \"%d\" type: \"%s\" for client \"%s\"", t.ID, t.Type, c.ID())
	if c.Connected() {
		taskWatchChan <- taskKeeper{c.ID(), t.ID, false}
		return t, nil
	}

	taskq.UnShift(t)
	log.Debugf("Shifted task id: \"%d\" type: \"%s\" returned to the queue because client \"%s\" already disconnected", t.ID, t.Type, c.ID())

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

	log.Debugf("Task done id: \"%d\" from client \"%s\"", int(id), c.ID())

	result := taskq.Result{
		ID:     uint64(id),
		Result: args[1],
	}

	taskq.Done(result)
	taskWatchChan <- taskKeeper{c.ID(), uint64(id), true}

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

	log.Debugf("Task error id: \"%d\" err: \"%s\" from client \"%s\"", int(id), err, c.ID())
	result := taskq.Result{
		ID:  uint64(id),
		Err: err,
	}

	taskq.Done(result)
	taskWatchChan <- taskKeeper{c.ID(), uint64(id), true}

	return nil, nil
}

func cronRunHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
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

	resChan := taskq.Push(&t)

	res := <-resChan
	if res.Err != "" {
		return nil, errors.New(res.Err)
	}

	return res.Result, nil
}

func internalOpenCallback(c *wango.Conn) {
	log.Infof("Connected client to TQ: '%s'", c.ID())
	workerConnectChan <- c.ID()
}

func internalCloseCallback(c *wango.Conn) {
	log.Infof("Disconnected client from TQ: '%s'", c.ID())
	workerDisconnectChan <- c.ID()
}

// args: uri string, event interface{}, subscribers array of connIDs
// This data will be transferred sent as event on "events" topic
func publishHandler(c *wango.Conn, _uri string, args ...interface{}) (interface{}, error) {
	if len(args) < 3 {
		return nil, berrors.ErrInvalidArguments
	}

	uri, ok := args[0].(string)
	if !ok {
		return nil, berrors.ErrInvalidArguments
	}

	wampServer.Publish(uri, args[1])

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

func subStoresHandler(c *wango.Conn, _uri string, args ...interface{}) (interface{}, error) {
	storeName := strings.TrimLeft(_uri, uriSubStores)
	t := taskq.Task{
		Store:  storeName,
		Type:   taskq.DbFind,
		UserID: "root",
		Arguments: map[string]interface{}{
			"query": map[string]interface{}{},
			"take":  1,
		},
	}

	_res, err := taskq.PushAndGetResult(&t, 0)
	if err != nil {
		return nil, err
	}

	result := map[string]interface{}{"event": "init", "data": nil}
	res, ok := _res.(map[string]interface{})
	if !ok {
		result["data"] = _res
		return result, nil
	}

	result["data"] = res["items"]

	return result, nil
}

func taskWatcher() {
	workerTasks := map[string]map[uint64]struct{}{}
	errWorkerDisconnectedText := "connection with worker lost"
	for {
		select {
		case t := <-taskWatchChan:
			if t.done {
				delete(workerTasks[t.workerID], t.taskID)
			} else {
				workerTasks[t.workerID][t.taskID] = struct{}{}
			}
		case workerID := <-workerConnectChan:
			workerTasks[workerID] = map[uint64]struct{}{}
		case workerID := <-workerDisconnectChan:
			workerTasksNumber := len(workerTasks[workerID])
			if len(workerTasks[workerID]) == 0 {
				continue
			}
			log.Infof("Worker %s disconnected. Need to close all proccessing tasks by this worker with error. Worker is running %d tasks now.", workerID, workerTasksNumber)
			for taskID := range workerTasks[workerID] {
				result := taskq.Result{
					ID:  taskID,
					Err: errWorkerDisconnectedText,
				}
				taskq.Done(result)
			}
			delete(workerTasks, workerID)
			log.Infof("All workers %s tasks closed.", workerID)
		}
	}
}

func runServer() {
	go taskWatcher()

	wampServer.SetSessionOpenCallback(internalOpenCallback)
	wampServer.SetSessionCloseCallback(internalCloseCallback)

	err := wampServer.RegisterRPCHandler(getTaskURI, taskGetHandler)
	if err != nil {
		panic(err)
	}

	err = wampServer.RegisterRPCHandler(doneTaskURI, taskDoneHandler)
	if err != nil {
		panic(err)
	}

	err = wampServer.RegisterRPCHandler(errorTaskURI, taskErrorHandler)
	if err != nil {
		panic(err)
	}

	err = wampServer.RegisterRPCHandler(publishURI, publishHandler)
	if err != nil {
		panic(err)
	}

	err = wampServer.RegisterRPCHandler(cronRunURI, cronRunHandler)
	if err != nil {
		panic(err)
	}

	err = wampServer.RegisterSubHandler(uriSubStores, subStoresHandler, nil, nil)
	if err != nil {
		panic(err)
	}

	s := new(websocket.Server)
	s.Handshake = func(c *websocket.Config, r *http.Request) error {
		return nil
	}

	s.Handler = func(ws *websocket.Conn) {
		wampServer.WampHandler(ws, nil)
	}
	http.Handle("/", s)

	if tqPort := os.Getenv("BLANK_TASK_QUEUE_PORT"); len(tqPort) > 0 {
		listeningPort = tqPort
	}

	log.Info("Will listen for connection on port ", listeningPort)
	err = http.ListenAndServe(":"+listeningPort, nil)
	if err != nil {
		panic("ListenAndServe: " + err.Error())
	}
}
