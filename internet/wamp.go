package internet

import (
	"time"

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
	uriPasswordResetRequest = "com.send-reset-link"
	uriResetPassword        = "com.reset-password"

	uriState  = "com.state"
	uriAction = "com.action"
	uriTime   = "com.time"

	uriSubConfig = "com.config"
	uriSubStores = "com.stores"
	uriSubUser   = "com.user"
	uriSubReload = "com.reload"
)

var (
	rgxRPC = rgx.New(`^com\.stores\.(?P<store>[a-zA-Z_]*).(?P<command>[a-z\-]*)$`)
	w      = wango.New()
)

func wampInit() *wango.Wango {
	w.StringMode()
	w.SetSessionOpenCallback(sessionOpenCallback)
	w.SetSessionCloseCallback(sessionCloseCallback)

	err := w.RegisterRPCHandler(uriSignIn, signInHandler)
	if err != nil {
		panic(err)
	}
	err = w.RegisterRPCHandler(uriSignOut, signOutHandler)
	if err != nil {
		panic(err)
	}
	err = w.RegisterRPCHandler(uriState, stateHandler)
	if err != nil {
		panic(err)
	}
	err = w.RegisterRPCHandler(uriAction, actionHandler)
	if err != nil {
		panic(err)
	}
	err = w.RegisterRPCHandler(rgxRPC.Regexp, rgxRPCHandler)
	if err != nil {
		panic(err)
	}

	err = w.RegisterRPCHandler("com.check-user", checkUserHandler)
	if err != nil {
		panic(err)
	}

	err = w.RegisterRPCHandler(uriSignUp, signUpHandler)
	if err != nil {
		panic(err)
	}
	err = w.RegisterRPCHandler(uriPasswordResetRequest, passwordResetRequestHandler)
	if err != nil {
		panic(err)
	}
	err = w.RegisterRPCHandler(uriResetPassword, resetPasswordHandler)
	if err != nil {
		panic(err)
	}

	err = w.RegisterSubHandler(uriSubUser, subUserHandler, nil, nil)
	if err != nil {
		panic(err)
	}
	err = w.RegisterSubHandler(uriSubConfig, subConfigHandler, nil, nil)
	if err != nil {
		panic(err)
	}
	err = w.RegisterRPCHandler(uriTime, timeHandler)
	if err != nil {
		panic(err)
	}
	err = w.RegisterSubHandler(uriSubStores, subStoresHandler, unsubStoresHandler, nil)
	if err != nil {
		panic(err)
	}

	return w
}

func sessionOpenCallback(c *wango.Conn) {

}

func sessionCloseCallback(c *wango.Conn) {
	extra := c.GetExtra()
	if extra == nil {
		return
	}
	cred, ok := extra.(credentials)
	if !ok {
		log.WithField("extra", extra).Warn("Invalid type of extra on session close")
		return
	}
	log.WithFields(log.Fields{"connId": c.ID(), "apiKey": cred.apiKey, "userId": cred.userID}).Info("User disconnected")
	err := intranet.DeleteConnection(cred.apiKey, c.ID())
	if err != nil {
		log.WithError(err).Error("Can't delete connection when session closed")
	}
}

func anyHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	return "8===>", nil
}

func timeHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	return time.Now().Format(time.RFC3339Nano), nil
}

func actionHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	if len(args) < 3 {
		return nil, berrors.ErrInvalidArguments
	}
	var userID string
	extra := c.GetExtra()
	if extra != nil {
		cred, ok := extra.(credentials)
		if !ok {
			log.WithField("extra", extra).Warn("Invalid type of extra on connection when rpx handler")
			return nil, berrors.ErrError
		}
		_, err := intranet.CheckSession(cred.apiKey)
		if err != nil {
			return nil, berrors.ErrForbidden
		}
		userID = cred.userID
	}
	store, ok := args[0].(string)
	if !ok {
		return nil, berrors.ErrInvalidArguments
	}
	actionID, ok := args[1].(string)
	if !ok {
		return nil, berrors.ErrInvalidArguments
	}
	t := taskq.Task{
		Type:   taskq.DbAction,
		Store:  store,
		UserID: userID,
		Arguments: map[string]interface{}{
			"itemId":   args[2],
			"actionId": actionID,
		},
	}
	if len(args) > 3 {
		t.Arguments["data"] = args[3]
	}
	resChan := taskq.Push(&t)

	res := <-resChan
	if res.Err != "" {
		return nil, errors.New(res.Err)
	}

	return res.Result, nil
}

func checkUserHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	if len(args) == 0 {
		return nil, berrors.ErrInvalidArguments
	}
	t := taskq.Task{
		Type:   taskq.DbFind,
		UserID: "root",
		Store:  "users",
		Arguments: map[string]interface{}{
			"query": map[string]interface{}{
				"query": map[string]interface{}{
					"email": args[0],
				},
				"props": []string{"_id"},
			},
		},
	}
	_res, err := taskq.PushAndGetResult(&t, time.Second*5)
	if err != nil {
		return "USER_NOT_FOUND", nil
	}
	res, ok := _res.(map[string]interface{})
	if !ok {
		return nil, berrors.ErrError
	}
	_items, ok := res["items"]
	if !ok {
		return nil, berrors.ErrError
	}
	items, ok := _items.([]interface{})
	if !ok {
		return nil, berrors.ErrError
	}
	if len(items) > 0 {
		return "USER_EXISTS", nil
	}
	return "USER_NOT_FOUND", nil
}

func passwordResetRequestHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	if len(args) == 0 {
		return nil, berrors.ErrInvalidArguments
	}
	arguments, ok := args[0].(map[string]interface{})
	if !ok {
		return nil, berrors.ErrInvalidArguments
	}
	t := taskq.Task{
		Type:      taskq.PasswordResetRequest,
		Arguments: arguments,
	}
	return taskq.PushAndGetResult(&t, time.Second*30)
}

func resetPasswordHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	if len(args) == 0 {
		return nil, berrors.ErrInvalidArguments
	}
	arguments, ok := args[0].(map[string]interface{})
	if !ok {
		return nil, berrors.ErrInvalidArguments
	}
	t := taskq.Task{
		Type:      taskq.PasswordReset,
		Arguments: arguments,
	}
	return taskq.PushAndGetResult(&t, time.Second*30)
}

func signInHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	if len(args) < 2 {
		return nil, berrors.ErrInvalidArguments
	}
	login, ok := args[0].(string)
	if !ok {
		return nil, berrors.ErrInvalidArguments
	}
	if login == "$userKey$" {
		apiKey, ok := args[1].(string)
		if !ok {
			return nil, berrors.ErrInvalidArguments
		}
		log.WithField("apiKey", apiKey).WithField("rpc", "signIn").Debug("Will check for session")
		userID, err := intranet.CheckSession(apiKey)
		log.WithField("userId", userID).WithError(err).WithField("rpc", "signIn").Debug("Check session response")
		if err != nil {
			return nil, err
		}
		t := taskq.Task{
			Type:   taskq.DbGet,
			UserID: "root",
			Store:  "users",
			Arguments: map[string]interface{}{
				"_id": userID,
			},
		}
		res, err := taskq.PushAndGetResult(&t, 0)
		if err != nil {
			return nil, err
		}
		user, ok := res.(map[string]interface{})
		if !ok {
			log.WithField("result", res).Warn("Invalid type of task result")
			return nil, berrors.ErrError
		}

		c.SetExtra(credentials{userID, apiKey})
		result := map[string]interface{}{
			"key":  apiKey,
			"user": user,
		}

		return result, nil
	}

	t := taskq.Task{
		Type: taskq.Auth,
		Arguments: map[string]interface{}{
			"login":    args[0],
			"password": args[1],
		},
	}
	res, err := taskq.PushAndGetResult(&t, 0)
	if err != nil {
		return nil, err
	}
	user, ok := res.(map[string]interface{})
	if !ok {
		log.WithField("result", res).Warn("Invalid type of result on authentication")
		return nil, berrors.ErrError
	}
	userID, ok := user["_id"].(string)
	if !ok {
		log.WithField("user._id", user["_id"]).Warn("Invalid type of user._id")
		return nil, berrors.ErrError
	}

	apiKey, err := intranet.NewSession(userID, user)
	if err != nil {
		return nil, err
	}
	c.SetExtra(credentials{userID, apiKey})

	result := map[string]interface{}{
		"key":  apiKey,
		"user": user,
	}

	return result, nil
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
	c.SetExtra(nil)
	return nil, err
}

func signUpHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	if len(args) == 0 {
		return nil, berrors.ErrInvalidArguments
	}
	if c.GetExtra() != nil {
		return nil, errors.New("already logged in, can't signup")
	}
	arguments, ok := args[0].(map[string]interface{})
	if !ok {
		return nil, berrors.ErrInvalidArguments
	}
	t := taskq.Task{
		Type:      taskq.SignUp,
		Arguments: arguments,
	}
	res, err := taskq.PushAndGetResult(&t, time.Second*10)
	if err != nil {
		return nil, err
	}
	return res, nil
}

func stateHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
	return "ready", nil
}

func rgxRPCHandler(c *wango.Conn, uri string, args ...interface{}) (interface{}, error) {
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
		_, err := intranet.CheckSession(cred.apiKey)
		if err != nil {
			return nil, berrors.ErrForbidden
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
			return taskq.PushAndGetResult(&t, time.Second*5)
		case "save":
			t.Type = taskq.DbSet
			t.Arguments = map[string]interface{}{"item": args[0]}
			return taskq.PushAndGetResult(&t, time.Second*5)
		case "delete":
			t.Type = taskq.DbDelete
			t.Arguments = map[string]interface{}{"_id": args[0]}
			return taskq.PushAndGetResult(&t, time.Second*5)
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
			return taskq.PushAndGetResult(&t, time.Second*5)
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
			return taskq.PushAndGetResult(&t, time.Second*5)
		case "find":
			t.Type = taskq.DbFind
			t.Arguments = map[string]interface{}{
				"query": args[0],
			}
			return taskq.PushAndGetResult(&t, time.Second*5)
		case "widget-data":
			if len(args) < 3 {
				return nil, berrors.ErrInvalidArguments
			}
			t.Type = taskq.WidgetData
			t.Arguments = map[string]interface{}{
				"widgetId": args[0],
				"data":     args[1],
				"itemId":   args[2],
			}
			return taskq.PushAndGetResult(&t, 0)
		}
	}
	return nil, nil
}
