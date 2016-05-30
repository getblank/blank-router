package intranet

func Init() {
	go connectToSr()
	runServer()
}
