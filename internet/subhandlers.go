package internet

import (
	"errors"

	log "github.com/Sirupsen/logrus"

	"github.com/getblank/blank-router/berrors"
	"github.com/getblank/blank-router/intranet"
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
	return nil, intranet.AddSubscription(cred.apiKey, c.ID(), uri, nil)
}

func subConfigHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	extra := c.GetExtra()
	if extra == nil {
		return nil, berrors.ErrForbidden
	}

	cred := extra.(credentials)

	t := taskq.Task{
		Type:   taskq.UserConfig,
		UserID: cred.userID,
	}
	resChan := taskq.Push(t)

	res := <-resChan
	if res.Err != "" {
		return nil, errors.New(res.Err)
	}

	return res.Result, nil
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
	return nil, intranet.AddSubscription(cred.apiKey, c.ID(), uri, data)
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
	return nil, intranet.DeleteSubscription(cred.apiKey, c.ID(), uri)
}

