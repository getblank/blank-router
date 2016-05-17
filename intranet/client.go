package intranet

import (
	"sync"
	"time"

	"github.com/getblank/wango"
)

var (
	srClient *wango.Wango
	srLocker sync.RWMutex
)

func connectedToSR(w *wango.Wango) {
	println("Connected to SR: ", srAddress)
	srLocker.Lock()
	srClient = w
	srLocker.Unlock()

	srClient.Call("register", map[string]interface{}{"type": "taskQueue", "port": "2345"})
}

func connectToSr() {
	for {
		println("Attempt to connect to SR: ", srAddress)
		client, err := wango.Connect(srAddress, "http://127.0.0.1:1234")
		if err != nil {
			println("Can'c connect to service registry: " + err.Error())
			time.Sleep(time.Second)
			continue
		}
		client.SetSessionCloseCallback(onDisconnect)
		connectedToSR(client)
		break
	}
}

func onDisconnect(c *wango.Conn) {
	srLocker.Lock()
	srClient = nil
	srLocker.Unlock()
	connectToSr()
}
