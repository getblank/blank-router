package main

import (
	"os"

	"github.com/spf13/cobra"

	log "github.com/Sirupsen/logrus"
	_ "github.com/getblank/blank-router/internet"
	"github.com/getblank/blank-router/intranet"
)

var (
	srAddress string
)

func main() {
	// log.SetFormatter(&log.JSONFormatter{})
	rootCmd := &cobra.Command{
		Use:   "router",
		Short: "Router for Blank platform",
		Long:  "The next generation of web applications. This is the router subsytem.",
		Run: func(cmd *cobra.Command, args []string) {
			log.Info("Router started")
			intranet.Init(srAddress)
		},
	}
	srAddress = *(rootCmd.PersistentFlags().StringP("service-registry", "s", "ws://localhost:1234", "Service registry uri"))

	if err := rootCmd.Execute(); err != nil {
		println(err.Error())
		os.Exit(-1)
	}
}
