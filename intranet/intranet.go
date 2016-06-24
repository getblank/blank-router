package intranet

// Init is a main entry point for the intranet package
func Init() {
	go connectToSr()
	runServer()
}
