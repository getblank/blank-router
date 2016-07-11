package main

import (
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"

	log "github.com/Sirupsen/logrus"
	"github.com/getblank/blank-router/internet"
	"github.com/getblank/blank-router/intranet"
	"github.com/getblank/blank-router/settings"
)

var (
	buildTime string
	gitHash   string
	version   = "0.0.24"
)

func main() {
	if os.Getenv("BLANK_DEBUG") != "" {
		log.SetLevel(log.DebugLevel)
		settings.DevMode = true
	}
	var srAddress *string
	var verFlag *bool

	rootCmd := &cobra.Command{
		Use:   "router",
		Short: "Router for Blank platform",
		Long:  "The next generation of web applications. This is the router subsytem.",
		Run: func(cmd *cobra.Command, args []string) {
			if *verFlag {
				printVersion()
				return
			}
			log.Info("Router started")
			settings.SRAddress = *srAddress
			settings.SRHTTPAddress = "http:" + strings.TrimPrefix(*srAddress, "ws:")
			go internet.Init()
			intranet.Init()
		},
	}
	srAddress = rootCmd.PersistentFlags().StringP("service-registry", "s", "ws://localhost:1234", "Service registry uri")
	verFlag = rootCmd.PersistentFlags().BoolP("version", "v", false, "Prints version and exit")

	if err := rootCmd.Execute(); err != nil {
		println(err.Error())
		os.Exit(-1)
	}
}

func printVersion() {
	fmt.Printf("blank-router: \tv%s \t build time: %s \t commit hash: %s \n", version, buildTime, gitHash)
}
