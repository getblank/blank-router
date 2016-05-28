package main

//go:generate go-bindata -pkg internet -o internet/assets.go -prefix "blank-web-app/" blank-web-app/release/ blank-web-app/src/html/ blank-web-app/src/fonts/

import (
	"os"

	"github.com/spf13/cobra"

	log "github.com/Sirupsen/logrus"
	_ "github.com/getblank/blank-router/internet"
	"github.com/getblank/blank-router/intranet"
	"github.com/getblank/blank-router/settings"
)

func main() {
	// log.SetFormatter(&log.JSONFormatter{})
	var srAddress *string
	var devMode *bool

	rootCmd := &cobra.Command{
		Use:   "router",
		Short: "Router for Blank platform",
		Long:  "The next generation of web applications. This is the router subsytem.",
		Run: func(cmd *cobra.Command, args []string) {
			log.Info("Router started")
			settings.SRAddress = *srAddress
			settings.DevMode = *devMode
			intranet.Init()
		},
	}
	srAddress = rootCmd.PersistentFlags().StringP("service-registry", "s", "ws://localhost:1234", "Service registry uri")
	devMode = rootCmd.PersistentFlags().BoolP("dev-mode", "d", false, "Development mode")

	if err := rootCmd.Execute(); err != nil {
		println(err.Error())
		os.Exit(-1)
	}
}
