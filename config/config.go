package config

import "sync"

var (
	conf            = map[string]Store{}
	locker          sync.RWMutex
	onUpdateHandler func(map[string]Store)
)

// Store is a small representation of store in config
type Store struct {
	Actions      []Action   `json:"actions,omitempty"`      // Перечень действий над объектом
	StoreActions []Action   `json:"storeActions,omitempty"` // Перечень действий при поступлении внешних событий
	HTTPHooks    []HTTPHook `json:"httpHooks,omitempty"`    // Http хуки (HTTP API).
	HTTPAPI      bool       `json:"httpApi,omitempty"`      // Флаг формирования HTTP REST API для сторы
}

// Action  is a small representation of action in config
type Action struct {
	ID                  string `json:"_id"`
	ConcurentCallsLimit int    `json:"concurentCallsLimit,omitempty"` // Max concurrent calls of action
	Multi               bool   `json:"multi"`                         // Enables action for multiple items !!!NOT IMPLEMENTED!!!
	Type                string `json:"type,omitempty"`
}

// HttpHook  is a small representation of HttpHooks in config
type HTTPHook struct {
	URI                 string `json:"uri"`                           // URI, по которому будет доступен хук. Например, если uri=users, то хук будет http://server-address/hooks/users
	Method              string `json:"method"`                        // HTTP method (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
	ConcurentCallsLimit int    `json:"concurentCallsLimit,omitempty"` // Max concurrent calls of http hook
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
