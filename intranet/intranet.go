package intranet

import (
	log "github.com/Sirupsen/logrus"
)

var (
	srAddress string
)

func Init(srAddr string) {
	log.Info("Init intranet ", srAddr)
	srAddress = srAddr

	connectToSr()
	runServer()
}
