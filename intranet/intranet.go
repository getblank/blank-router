package intranet

var srAddress string

func Init(srAddr string) {
	srAddress = srAddr

	connectToSr()
	runServer()
}
