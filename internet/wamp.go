package internet

import (
	log "github.com/Sirupsen/logrus"
	"github.com/getblank/rgx"
	"github.com/getblank/wango"
	"github.com/pkg/errors"

	"github.com/getblank/blank-router/berrors"
	"github.com/getblank/blank-router/intranet"
	"github.com/getblank/blank-router/taskq"
)

const (
	uriSignIn               = "com.sign-in"
	uriSignOut              = "com.sign-out"
	uriSignUp               = "com.sign-up"
	uriResetPasswordRequest = "com.send-reset-link"
	uriResetPassword        = "com.reset-password"

	uriState  = "com.state"
	uriAction = "com.action"

	uriSubConfig = "com.config"
	uriSubStores = "com.stores"
	uriSubUser   = "com.user"
	uriSubReload = "com.reload"
)

var (
	rgxRPC = rgx.New(`^com\.stores\.(?P<store>[a-zA-Z_]*).(?P<command>[a-z\-]*)$`)
)

func wampInit() *wango.Wango {
	w := wango.New()
	w.StringMode()

	w.RegisterRPCHandler(uriSignIn, signInHandler)
	w.RegisterRPCHandler(uriState, stateHandler)
	w.RegisterRPCHandler(rgxRPC.Regexp, rgxRpcHandler)

	w.RegisterRPCHandler(uriSignUp, anyHandler)
	w.RegisterRPCHandler(uriResetPasswordRequest, anyHandler)
	w.RegisterRPCHandler(uriResetPassword, anyHandler)

	return w
}

func anyHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	return "8===>", nil
}

func signInHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	if len(args) < 2 {
		return nil, berrors.ErrInvalidArguments
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
	c.SetExtra(credentials{userID, apiKey})

	return apiKey, nil
}

func signOutHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	extra := c.GetExtra()
	if extra == nil {
		return nil, errors.New("No session")
	}
	cred, ok := extra.(credentials)
	if !ok {
		log.WithField("extra", extra).Warn("Extra is invalid type")
		return nil, berrors.ErrError
	}
	err := intranet.DeleteSession(cred.apiKey)
	return nil, err
}

func stateHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	return "ready", nil
}

func rgxRpcHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	if len(args) == 0 {
		return nil, berrors.ErrInvalidArguments
	}

	userID := "guest"

	extra := c.GetExtra()
	if extra != nil {
		cred, ok := extra.(credentials)
		if !ok {
			log.WithField("extra", extra).Warn("Invalid type of extra on connection when rpx handler")
			return nil, berrors.ErrError
		}
		userID = cred.userID
	}

	match, ok := rgxRPC.FindStringSubmatchMap(uri)
	if ok {
		store := match["store"]
		t := taskq.Task{
			UserID: userID,
			Store:  store,
		}
		switch match["command"] {
		case "get":
			t.Type = taskq.DbGet
			t.Arguments = map[string]interface{}{"_id": args[0]}
			return call(t)
		case "save":
			t.Type = taskq.DbSet
			t.Arguments = map[string]interface{}{"item": args[0]}
			return call(t)
		case "delete":
			t.Type = taskq.DbDelete
			t.Arguments = map[string]interface{}{"_id": args[0]}
			return call(t)
		case "push":
			if len(args) < 3 {
				return nil, berrors.ErrInvalidArguments
			}
			t.Type = taskq.DbPush
			t.Arguments = map[string]interface{}{
				"_id":  args[0],
				"prop": args[1],
				"data": args[2],
			}
			return call(t)
		case "load-refs":
			if len(args) < 4 {
				return nil, berrors.ErrInvalidArguments
			}
			t.Type = taskq.DbLoadRefs
			t.Arguments = map[string]interface{}{
				"_id":      args[0],
				"prop":     args[1],
				"selected": args[2],
				"query":    args[3],
			}
			return call(t)
		case "find":
			t.Type = taskq.DbFind
			t.Arguments = map[string]interface{}{
				"query": args[0],
			}
			return call(t)
		}
	}
	return nil, nil
}
