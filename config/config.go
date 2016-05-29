package config

import "sync"

var (
	conf            = map[string]Store{}
	locker          sync.RWMutex
	onUpdateHandler func(map[string]Store)
)

// Store is a small representation of store in config
type Store struct {
	Type         string     `json:"type"`
	Actions      []Action   `json:"actions,omitempty"`
	StoreActions []Action   `json:"storeActions,omitempty"`
	HTTPHooks    []HTTPHook `json:"httpHooks,omitempty"`
	HTTPAPI      bool       `json:"httpApi,omitempty"`
}

// Action  is a small representation of action in config
type Action struct {
	ID                  string `json:"_id"`
	ConcurentCallsLimit int    `json:"concurentCallsLimit,omitempty"`
	Multi               bool   `json:"multi"`
	Type                string `json:"type,omitempty"`
}

// HttpHook  is a small representation of HttpHooks in config
type HTTPHook struct {
	URI                 string `json:"uri"`
	Method              string `json:"method"`
	ConcurentCallsLimit int    `json:"concurentCallsLimit,omitempty"`
}

// ConfigUpdate stores new config
func ConfigUpdate(c map[string]Store) {
	locker.Lock()
	defer locker.Unlock()
	conf = cloneConfig(c)
	if onUpdateHandler != nil {
		onUpdateHandler(cloneConfig(c))
	}
}

// OnUpdate registers handler for config update event
func OnUpdate(fn func(map[string]Store)) {
	onUpdateHandler = fn
}

func cloneConfig(c map[string]Store) map[string]Store {
	var res = map[string]Store{}
	for storeName, store := range c {
		s := Store{
			HTTPAPI: store.HTTPAPI,
		}
		s.Type = store.Type
		if store.Actions != nil {
			s.Actions = make([]Action, len(store.Actions))
			for i, a := range store.Actions {
				s.Actions[i] = a
			}
		}
		if store.StoreActions != nil {
			s.StoreActions = make([]Action, len(store.StoreActions))
			for i, a := range store.StoreActions {
				s.StoreActions[i] = a
			}
		}
		if store.HTTPHooks != nil {
			s.HTTPHooks = make([]HTTPHook, len(store.HTTPHooks))
			for i, h := range store.HTTPHooks {
				s.HTTPHooks[i] = h
			}
		}

		res[storeName] = s
	}
	return res
}
