package config

import (
	"encoding/json"
	"sync"

	log "github.com/Sirupsen/logrus"
)

var (
	conf            = map[string]Store{}
	serverSettings  = ServerSettings{}
	locker          sync.RWMutex
	onUpdateHandler func(map[string]Store)
	commit          string
	buildTime       string
)

// Store is a small representation of store in config
type Store struct {
	Version        int                    `json:"version"` // Scheme version
	Store          string                 `json:"store"`   // just name of the store
	Type           string                 `json:"type"`
	Props          interface{}            `json:"props"` // just dummy for props needed when HTTPAPI enabled
	Actions        []Action               `json:"actions,omitempty"`
	StoreActions   []Action               `json:"storeActions,omitempty"`
	HTTPHooks      []HTTPHook             `json:"httpHooks,omitempty"`
	HTTPAPI        bool                   `json:"httpApi,omitempty"`
	StoreLifeCycle Hooks                  `json:"storeLifeCycle,omitempty"`
	Entries        map[string]interface{} `json:"entries,omitempty"`
}

// Action  is a small representation of action in config
type Action struct {
	ID                  string `json:"_id"`
	ConcurentCallsLimit int    `json:"concurentCallsLimit,omitempty"`
	Multi               bool   `json:"multi"`
	Type                string `json:"type,omitempty"`
}

// HTTPHook  is a small representation of HttpHooks in config
type HTTPHook struct {
	URI                 string `json:"uri"`
	Method              string `json:"method"`
	ConcurentCallsLimit int    `json:"concurentCallsLimit,omitempty"`
}

// Hooks holds JavaScript code of hooks
type Hooks struct {
	WillCreate string           `json:"willCreate,omitempty"`
	DidCreate  string           `json:"didCreate,omitempty"`
	WillSave   string           `json:"willSave,omitempty"`
	DidSave    string           `json:"didSave,omitempty"`
	WillRemove string           `json:"willRemove,omitempty"`
	DidRemove  string           `json:"didRemove,omitempty"`
	DidRead    string           `json:"didRead,omitempty"`
	DidStart   string           `json:"didStart,omitempty"`
	Migration  []*MigrationTask `json:"migration,omitempty"`
}

// MigrationTask describes scheme migration scripts
type MigrationTask struct {
	Version int    `json:"version"`
	Script  string `json:"script"`
}

// ServerSettings used to hold several server settings
type ServerSettings struct {
	SSOOrigins []string `json:"ssoOrigins,omitempty"`
}

// ServerSettings used to hold several server settings
type CommonSettings struct {
	Commit    string `json:"commit"`
	BuildTime string `json:"buildTime"`
}

func GetVersion() (string, string) {
	locker.RLock()
	defer locker.RUnlock()

	return commit, buildTime
}

// GetSSOOrigins returns configured SSO origins
func GetSSOOrigins() []string {
	locker.Lock()
	defer locker.Unlock()
	res := make([]string, len(serverSettings.SSOOrigins))
	for i := range serverSettings.SSOOrigins {
		res[i] = serverSettings.SSOOrigins[i]
	}
	return res
}

// Update stores new config
func Update(c map[string]Store) {
	locker.Lock()
	defer locker.Unlock()
	conf = clone(c)
	if onUpdateHandler != nil {
		onUpdateHandler(clone(c))
	}

	if s, ok := conf["_serverSettings"]; ok {
		encoded, err := json.Marshal(s.Entries)
		if err != nil {
			log.Error("Can't marshal server settings", err)
			return
		}
		se := ServerSettings{}
		err = json.Unmarshal(encoded, &se)
		if err != nil {
			log.Error("Can't unmarshal server settings", err)
			return
		}
		serverSettings = se
	}

	if s, ok := conf["_commonSettings"]; ok {
		encoded, err := json.Marshal(s.Entries)
		if err != nil {
			log.Error("Can't marshal common settings", err)
			return
		}

		ce := CommonSettings{}
		err = json.Unmarshal(encoded, &ce)
		if err != nil {
			log.Error("Can't unmarshal common settings", err)
			return
		}

		commit = ce.Commit
		buildTime = ce.BuildTime
	}
}

// OnUpdate registers handler for config update event
func OnUpdate(fn func(map[string]Store)) {
	onUpdateHandler = fn
}

// Deep config cloner
func clone(c map[string]Store) map[string]Store {
	var res = map[string]Store{}
	for storeName, store := range c {
		s := Store{
			Store:   storeName,
			Type:    store.Type,
			HTTPAPI: store.HTTPAPI,
			Props:   store.Props,
			Entries: map[string]interface{}{},
		}
		if store.Actions != nil {
			s.Actions = make([]Action, len(store.Actions))
			copy(s.Actions, store.Actions)
		}
		if store.StoreActions != nil {
			s.StoreActions = make([]Action, len(store.StoreActions))
			copy(s.StoreActions, store.StoreActions)
		}
		if store.HTTPHooks != nil {
			s.HTTPHooks = make([]HTTPHook, len(store.HTTPHooks))
			copy(s.HTTPHooks, store.HTTPHooks)
		}
		for k, v := range store.Entries {
			s.Entries[k] = v
		}

		res[storeName] = s
	}
	return res
}
