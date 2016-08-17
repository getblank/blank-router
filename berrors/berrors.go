package berrors

import "errors"

// Errors
var (
	ErrNotConnected     = errors.New("not connected")
	ErrError            = errors.New("unknown error")
	ErrInvalidArguments = errors.New("invalid arguments")
	ErrForbidden        = errors.New("access denied")
)
