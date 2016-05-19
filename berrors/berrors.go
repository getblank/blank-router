package berrors

import "errors"

var (
	ErrNotConnected     = errors.New("Not connected")
	ErrError            = errors.New("Unknown error")
	ErrInvalidArguments = errors.New("Invalid arguments")
	ErrForbidden        = errors.New("Access denied")
)
