package internet

import (
	"errors"
	"time"

	"github.com/getblank/blank-router/berrors"
	"github.com/getblank/blank-router/taskq"
	"github.com/getblank/wango"
)

func subUserHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	extra := c.GetExtra()
	if extra == nil {
		return nil, berrors.ErrForbidden
	}

	return nil, nil
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

	go func() {
		time.Sleep(time.Millisecond)
		w.Publish(uriSubConfig, res.Result)
	}()

	return res.Result, nil
}

func pubConfigHandler(uri string, event interface{}, extra interface{}) (bool, interface{}) {
	return true, nil
}
