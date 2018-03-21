package sr

import "github.com/getblank/blank-router/intranet"

type SessionRegistry struct{}

var sr *SessionRegistry

// CheckSession creates a new session in serviceRegistry
func (*SessionRegistry) CheckSession(apiKey string) (string, error) {
	return intranet.CheckSession(apiKey)
}

// DeleteSession delete session with provided apiKey from serviceRegistry
func (*SessionRegistry) DeleteSession(apiKey string) error {
	return intranet.DeleteSession(apiKey)
}

// NewSession creates a new session in serviceRegistry
func (*SessionRegistry) NewSession(user map[string]interface{}, sessionID string) (string, error) {
	return intranet.NewSession(user, sessionID)
}

// AddSubscription sends subscription info to session store.
func (*SessionRegistry) AddSubscription(apiKey, connID, uri string, extra interface{}) error {
	return intranet.AddSubscription(apiKey, connID, uri, extra)
}

// DeleteConnection sends delete connection event to sessions store
func (*SessionRegistry) DeleteConnection(apiKey, connID string) error {
	return intranet.DeleteConnection(apiKey, connID)
}

// DeleteSubscription sends delete subscription event to sessions store
func (*SessionRegistry) DeleteSubscription(apiKey, connID, uri string) error {
	return intranet.DeleteSubscription(apiKey, connID, uri)
}

func SR() *SessionRegistry {
	return sr
}

func init() {
	sr = new(SessionRegistry)
}
