package internet

import (
	"github.com/pkg/errors"

	log "github.com/Sirupsen/logrus"
	"github.com/getblank/wango"

	"github.com/getblank/blank-router/berrors"
	"github.com/getblank/blank-router/intranet"
	"github.com/getblank/blank-router/taskq"
)

const (
	uriSignIn  = "com.sign-in"
	uriSignOut = "com.sign-out"
	uriState   = "com.state"
)

var (
	errInvalidArguments = errors.New("Invalid arguments")
)

func wampInit() *wango.Wango {
	w := wango.New()
	w.StringMode()

	w.RegisterRPCHandler(uriSignIn, signInHandler)
	w.RegisterRPCHandler(uriState, stateHandler)

	return w
}

func signInHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	if len(args) < 2 {
		return nil, errInvalidArguments
	}
	t := taskq.Task{
		Type: taskq.Auth,
		Arguments: map[string]interface{}{
			"login":    args[0],
			"password": args[1],
		},
	}
	resChan := taskq.Push(t)

	res := <-resChan
	if res.Err != "" {
		return nil, errors.New(res.Err)
	}
	userID, ok := res.Result.(string)
	if !ok {
		log.WithField("result", res.Result).Warn("Invalid type of result on authentication")
		return nil, berrors.ErrError
	}

	apiKey, err := intranet.NewSession(userID)
	if err != nil {
		return nil, err
	}
	c.SetExtra(apiKey)

	return apiKey, nil
}

func signOutHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	extra := c.GetExtra()
	if extra == nil {
		return nil, errors.New("No session")
	}
	apiKey, ok := extra.(string)
	if !ok {
		log.WithField("extra", extra).Warn("Extra is not a string")
		return nil, berrors.ErrError
	}
	err := intranet.DeleteSession(apiKey)
	return nil, err
}

func stateHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	return "ready", nil
}
