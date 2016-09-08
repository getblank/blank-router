package config

import "sync"

var (
	conf            = map[string]Store{}
	locker          sync.RWMutex
	onUpdateHandler func(map[string]Store)
)

// Store is a small representation of store in config
type Store struct {
	Store          string      `json:"store"` // just name of the store
	Type           string      `json:"type"`
	Props          interface{} `json:"props"` // just dummy for props needed when HTTPAPI enabled
	Actions        []Action    `json:"actions,omitempty"`
	StoreActions   []Action    `json:"storeActions,omitempty"`
	HTTPHooks      []HTTPHook  `json:"httpHooks,omitempty"`
	HTTPAPI        bool        `json:"httpApi,omitempty"`
	StoreLifeCycle Hooks       `json:"storeLifeCycle,omitempty"`
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
	WillCreate string `json:"willCreate,omitempty"`
	DidCreate  string `json:"didCreate,omitempty"`
	WillSave   string `json:"willSave,omitempty"`
	DidSave    string `json:"didSave,omitempty"`
	WillRemove string `json:"willRemove,omitempty"`
	DidRemove  string `json:"didRemove,omitempty"`
	DidRead    string `json:"didRead,omitempty"`
	DidStart   string `json:"didStart,omitempty"`
}

// Update stores new config
func Update(c map[string]Store) {
	locker.Lock()
	defer locker.Unlock()
	conf = clone(c)
	if onUpdateHandler != nil {
		onUpdateHandler(clone(c))
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

		res[storeName] = s
	}
	return res
}
