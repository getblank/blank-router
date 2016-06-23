package main

import (
	"os"
	"strings"

	"github.com/spf13/cobra"

	log "github.com/Sirupsen/logrus"
	_ "github.com/getblank/blank-router/internet"
	"github.com/getblank/blank-router/intranet"
	"github.com/getblank/blank-router/settings"
)

var (
	buildTime string
	gitHash   string
	version   = "0.0.9"
)

func main() {
	if os.Getenv("BLANK_DEBUG") != "" {
		log.SetLevel(log.DebugLevel)
	}
	var srAddress *string
	var devMode *bool

	rootCmd := &cobra.Command{
		Use:   "router",
		Short: "Router for Blank platform",
		Long:  "The next generation of web applications. This is the router subsytem.",
		Run: func(cmd *cobra.Command, args []string) {
			log.Info("Router started")
			settings.SRAddress = *srAddress
			settings.SRHTTPAddress = "http:" + strings.TrimPrefix(*srAddress, "ws:")
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
