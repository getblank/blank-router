package intranet

import (
	"encoding/json"
	"sync"
	"time"

	log "github.com/sirupsen/logrus"
	"github.com/getblank/wango"

	"github.com/getblank/blank-router/berrors"
	"github.com/getblank/blank-router/config"
	"github.com/getblank/blank-router/settings"
	"github.com/getblank/blank-router/taskq"
)

var (
	srClient       *wango.Wango
	srLocker       sync.RWMutex
	onEventHandler = func(string, interface{}, []string) {}
)

const (
	uriNewSession       = "session.new"
	uriCheckSession     = "session.check"
	uriDeleteSession    = "session.delete"
	uriSubscribed       = "session.subscribed"
	uriUnsubscribed     = "session.unsubscribed"
	uriDeleteConnection = "session.delete-connection"
)

type service struct {
	Type    string `json:"type"`
	Address string `json:"address"`
	Port    string `json:"port"`
}

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
func NewSession(user map[string]interface{}, sessionID string) (string, error) {
	res, err := call(uriNewSession, user, sessionID)
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

// AddSubscription sends subscription info to session store.
func AddSubscription(apiKey, connID, uri string, extra interface{}) error {
	_, err := call(uriSubscribed, apiKey, connID, uri, extra)
	return err
}

// DeleteConnection sends delete connection event to sessions store
func DeleteConnection(apiKey, connID string) error {
	_, err := call(uriDeleteConnection, apiKey, connID)
	return err
}

// DeleteSubscription sends delete subscription event to sessions store
func DeleteSubscription(apiKey, connID, uri string) error {
	_, err := call(uriUnsubscribed, apiKey, connID, uri)
	return err
}

// OnEvent sets intranet event handler
func OnEvent(fn func(string, interface{}, []string)) {
	onEventHandler = fn
}

func call(uri string, args ...interface{}) (interface{}, error) {
	srLocker.RLock()
	w := srClient
	srLocker.RUnlock()
	if w == nil {
		return nil, berrors.ErrNotConnected
	}
	return w.Call(uri, args...)
}

func connectedToSR(w *wango.Wango) {
	log.Info("Connected to SR: ", settings.SRAddress)
	srLocker.Lock()
	srClient = w
	srLocker.Unlock()

	_, err := srClient.Call("register", map[string]interface{}{"type": "taskQueue", "port": listeningPort})
	if err != nil {
		log.WithError(err).Error("can't register taskQueue in SR")
	}
	err = srClient.Subscribe("events", srEventHandler)
	if err != nil {
		log.WithError(err).Error("can't subscribe to events")
	}
	err = srClient.Subscribe("config", configUpdateHandler)
	if err != nil {
		log.WithError(err).Error("can't subscribe to config")
	}
	err = srClient.Subscribe("registry", registryUpdateHandler)
	if err != nil {
		log.WithError(err).Error("can't subscribe to registry")
	}
}

func connectToSr() {
	reconnectChan := make(chan struct{})
	for {
		log.Infof("Attempt to connect to SR: %s", settings.SRAddress)
		client, err := wango.Connect(settings.SRAddress, "http://127.0.0.1:1234")
		if err != nil {
			log.Warn("Can'c connect to service registry: " + err.Error())
			time.Sleep(time.Second)
			continue
		}
		client.SetSessionCloseCallback(func(c *wango.Conn) {
			log.Warnf("Disconnected from SR: %s", settings.SRAddress)
			srLocker.Lock()
			srClient = nil
			srLocker.Unlock()
			reconnectChan <- struct{}{}
		})
		connectedToSR(client)
		<-reconnectChan
	}
}

func srEventHandler(_ string, _event interface{}) {
	if _event == nil {
		return
	}
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

func configUpdateHandler(_ string, _event interface{}) {
	encoded, err := json.Marshal(_event)
	if err != nil {
		log.WithError(err).Warn("Can't marshal arrived config")
		return
	}
	var conf map[string]config.Store
	err = json.Unmarshal(encoded, &conf)
	if err != nil {
		log.WithError(err).Error("Can't unmarshal arrived config")
		return
	}

	config.Update(conf)
	runMigrationScripts(conf)
}

var storeMigrationVersion = map[string]map[int]struct{}{}
var storeMigrationLocker sync.Mutex

func setProcessedStoreVersion(storeName string, version int) {
	storeMigrationLocker.Lock()
	defer storeMigrationLocker.Unlock()

	if storeMigrationVersion[storeName] == nil {
		storeMigrationVersion[storeName] = map[int]struct{}{}
	}

	storeMigrationVersion[storeName][version] = struct{}{}
}

func isStoreVersionProcessed(storeName string, version int) bool {
	storeMigrationLocker.Lock()
	defer storeMigrationLocker.Unlock()

	if storeMigrationVersion[storeName] == nil {
		return false
	}

	_, ok := storeMigrationVersion[storeName][version]
	return ok
}

func runMigrationScripts(conf map[string]config.Store) {
	for storeName, storeDesc := range conf {
		if storeDesc.StoreLifeCycle.Migration == nil {
			continue
		}

		if isStoreVersionProcessed(storeName, storeDesc.Version) {
			continue
		}

		log.Infof("Will run migration scripts for store %s if needed", storeName)
		t := &taskq.Task{
			Type:   taskq.StoreLifeCycle,
			UserID: "system",
			Store:  storeName,
			Arguments: map[string]interface{}{
				"event": "migration",
			},
		}

		res, err := taskq.PushAndGetResult(t, 0)
		if err != nil {
			log.Errorf("Migration scripts for store %s completed with error: %v", storeName, err)
			continue
		}

		setProcessedStoreVersion(storeName, storeDesc.Version)
		log.Infof("Migration scripts for store %s completed with result: %v", storeName, res)
	}
}

func registryUpdateHandler(_ string, _event interface{}) {
	encoded, err := json.Marshal(_event)
	if err != nil {
		log.WithField("error", err).Error("Can't marshal registry update event")
		return
	}
	var services map[string][]service
	err = json.Unmarshal(encoded, &services)
	if err != nil {
		log.WithField("error", err).Error("Can't unmarshal registry update event to []Services")
		return
	}
	fileStoreServices, ok := services["fileStore"]
	if !ok {
		log.Warn("No fileStore services in registry")
		return
	}
	if len(fileStoreServices) == 0 {
		log.Warn("No file stores in service registry")
		return
	}
	service := fileStoreServices[0]
	settings.SetFileStoreAddress(service.Address + ":" + service.Port)
}
