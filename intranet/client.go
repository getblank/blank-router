package intranet

import (
	"sync"
	"time"

	log "github.com/Sirupsen/logrus"
	"github.com/getblank/blank-router/berrors"
	"github.com/getblank/wango"
)

var (
	srClient *wango.Wango
	srLocker sync.RWMutex
)

const (
	uriNewSession    = "session.new"
	uriDeleteSession = "session.delete"
)

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

// DeleteSession delete session with provided apiKey from serviceRegistry
func DeleteSession(apiKey string) error {
	_, err := call(uriDeleteSession, apiKey)

	return err
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
