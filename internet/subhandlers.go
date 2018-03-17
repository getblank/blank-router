package internet

import (
	log "github.com/Sirupsen/logrus"

	"github.com/getblank/blank-router/berrors"
	"github.com/getblank/blank-router/taskq"
	"github.com/getblank/wango"
)

func subUserHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	extra := c.GetExtra()
	if extra == nil {
		return nil, berrors.ErrForbidden
	}
	cred, ok := extra.(credentials)
	if !ok {
		log.WithField("extra", extra).Warn("Invalid type of extra on connection when sub com.user handler")
		return nil, berrors.ErrError
	}
	t := taskq.Task{
		Type:      taskq.DbGet,
		Store:     "users",
		UserID:    cred.userID,
		Arguments: map[string]interface{}{"_id": cred.userID},
	}
	if cred.claims != nil {
		t.Arguments["tokenInfo"] = cred.claims.toMap()
	}

	res, err := taskq.PushAndGetResult(&t, 0)
	if err != nil {
		return nil, err
	}

	res = map[string]interface{}{"user": res}
	return res, srClient.AddSubscription(cred.sessionID, c.ID(), uri, nil)
}

func subConfigHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	extra := c.GetExtra()
	if extra == nil {
		return nil, berrors.ErrForbidden
	}

	cred := extra.(credentials)

	t := taskq.Task{
		Type:      taskq.UserConfig,
		UserID:    cred.userID,
		Arguments: map[string]interface{}{},
	}
	if cred.claims != nil {
		t.Arguments["tokenInfo"] = cred.claims.toMap()
	}

	log.Debugf("Config request received for client: \"%s\"", c.ID())
	res, err := taskq.PushAndGetResult(&t, 0)
	log.Debugf("Config request completed for client: \"%s\"", c.ID())
	if err != nil {
		return nil, err
	}

	return res, nil
}

func subStoresHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	// TODO: task to check permissions
	extra := c.GetExtra()
	if extra == nil {
		return nil, berrors.ErrForbidden
	}
	cred, ok := extra.(credentials)
	if !ok {
		log.WithField("extra", extra).Warn("Invalid type of extra on connection when sub stores handler")
		return nil, berrors.ErrError
	}

	var data interface{}
	if len(args) > 0 {
		data = args[0]
	}
	return nil, srClient.AddSubscription(cred.sessionID, c.ID(), uri, data)
}

func unsubStoresHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	extra := c.GetExtra()
	if extra == nil {
		return nil, berrors.ErrForbidden
	}
	cred, ok := extra.(credentials)
	if !ok {
		log.WithField("extra", extra).Warn("Invalid type of extra on connection when unsub stores handler")
		return nil, berrors.ErrError
	}
	return nil, srClient.DeleteSubscription(cred.sessionID, c.ID(), uri)
}
