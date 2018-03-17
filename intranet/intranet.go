package intranet

// Init is a main entry point for the intranet package
func Init(externalSR bool) {
	if externalSR {
		go connectToSr()
	}

	runServer()
}
