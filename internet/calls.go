package internet

import (
	"github.com/getblank/blank-router/taskq"
	"github.com/pkg/errors"
)

func call(t taskq.Task) (interface{}, error) {
	resChan := taskq.Push(t)

	res := <-resChan
	if res.Err != "" {
		return nil, errors.New(res.Err)
	}

	return res.Result, nil
}
