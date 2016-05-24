package intranet

var (
	srAddress string
)

func Init(srAddr string) {
	srAddress = srAddr

	go connectToSr()
	runServer()
}
