package settings

import "sync"

var (
	// SRAddress is a service registry address to connect
	SRAddress     string
	SRHTTPAddress string

	fileStoreAddress string
	settingsLocker   sync.RWMutex

	// DevMode is a flag signaling that blank-router started in dev environment
	DevMode bool
)

func GetFileStoreAddress() string {
	settingsLocker.RLock()
	defer settingsLocker.RUnlock()
	return fileStoreAddress
}

func SetFileStoreAddress(addr string) {
	settingsLocker.Lock()
	defer settingsLocker.Unlock()
	fileStoreAddress = addr
}
