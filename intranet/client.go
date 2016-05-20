package intranet

import (
	"sync"
	"time"

	log "github.com/Sirupsen/logrus"
	"github.com/getblank/blank-router/berrors"
	"github.com/getblank/wango"
)

var (
	srClient       *wango.Wango
	srLocker       sync.RWMutex
	onEventHandler = func(string, interface{}, []string) {}
)

const (
	uriNewSession    = "session.new"
	uriCheckSession  = "session.check"
	uriDeleteSession = "session.delete"
)

// CheckSession creates a new session in serviceRegistry
func CheckSession(apiKey string) (string, error) {
	res, err := call(uriCheckSession, apiKey)
	if err != nil {
		return "", err
	}
	userID, ok := res.(string)
	if !ok {
		log.WithField("result", res).Warn("Invalid type of result on new session")
		return "", berrors.ErrError
	}

	return userID, nil
}

// DeleteSession delete session with provided apiKey from serviceRegistry
func DeleteSession(apiKey string) error {
	_, err := call(uriDeleteSession, apiKey)

	return err
}

// NewSession creates a new session in serviceRegistry
func NewSession(userID string) (string, error) {
	res, err := call(uriNewSession, userID)
	if err != nil {
		return "", err
	}
	apiKey, ok := res.(string)
	if !ok {
		log.WithField("result", res).Warn("Invalid type of result on new session")
		return "", berrors.ErrError
	}

	return apiKey, nil
}

func OnEvent(fn func(string, interface{}, []string)) {
	onEventHandler = fn
}

func call(uri string, args ...interface{}) (interface{}, error) {
	srLocker.RLock()
	defer srLocker.RUnlock()
	if srClient == nil {
		return nil, berrors.ErrNotConnected
	}
	return srClient.Call(uri, args...)
}

func connectedToSR(w *wango.Wango) {
	log.Info("Connected to SR: ", srAddress)
	srLocker.Lock()
	srClient = w
	srLocker.Unlock()

	srClient.Call("register", map[string]interface{}{"type": "taskQueue", "port": "2345"})
	srClient.Subscribe("events", srEventHandler)
}

func connectToSr() {
	for {
		log.Info("Attempt to connect to SR: ", srAddress)
		client, err := wango.Connect(srAddress, "http://127.0.0.1:1234")
		if err != nil {
			log.Warn("Can'c connect to service registry: " + err.Error())
			time.Sleep(time.Second)
			continue
		}
		client.SetSessionCloseCallback(onDisconnect)
		connectedToSR(client)
		break
	}
}

func onDisconnect(c *wango.Conn) {
	srLocker.Lock()
	srClient = nil
	srLocker.Unlock()
	connectToSr()
}

func srEventHandler(_ string, _event interface{}) {
	data, ok := _event.(map[string]interface{})
	if !ok {
		log.WithField("data", _event).Warn(`Invalid data in "events" event`)
		return
	}
	_uri, ok := data["uri"]
	if !ok {
		log.Warn(`No "uri" field in data in "events" event`)
		return
	}
	uri, ok := _uri.(string)
	if !ok {
		log.WithField("uri", _uri).Warn(`"uri" field in "events" event is not a string`)
		return
	}
	_subscribersInterface, ok := data["subscribers"]
	if !ok {
		log.Warn(`No "subscribers" field in "events" event`)
		return
	}
	event, ok := data["event"]
	if !ok {
		log.Warn(`No "event" field in data in "events" event`)
		return
	}
	_subscribers, ok := _subscribersInterface.([]interface{})
	if !ok {
		log.WithField("subscribers", _subscribersInterface).Warn(`"subscribers" field in "events" event is not an array`)
		return
	}
	subscribers := make([]string, len(_subscribers))
	for i, s := range _subscribers {
		subscriber, ok := s.(string)
		if !ok {
			log.WithField("subscriber", s).Warn(`"subscriber" in array field in "events" event is not a string`)
			return
		}
		subscribers[i] = subscriber
	}

	onEventHandler(uri, event, subscribers)
}
