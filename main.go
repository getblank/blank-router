package main

import (
	"fmt"
	"os"
	"strings"

	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"

	"github.com/getblank/blank-router/internet"
	"github.com/getblank/blank-router/intranet"
	"github.com/getblank/blank-router/settings"
	"github.com/getblank/blank-router/sr"
)

var (
	buildTime string
	gitHash   string
	version   = "0.2.5"
)

func main() {
	if os.Getenv("BLANK_DEBUG") != "" {
		log.SetLevel(log.DebugLevel)
	}
	if os.Getenv("DEV_MODE") != "" {
		settings.DevMode = true
	}
	log.SetFormatter(&log.JSONFormatter{})

	var srAddress *string
	var verFlag *bool

	rootCmd := &cobra.Command{
		Use:   "router",
		Short: "Router for Blank platform",
		Long:  "This is the router subsystem for Blank platform.",
		Run: func(cmd *cobra.Command, args []string) {
			if *verFlag {
				printVersion()
				return
			}

			if sr := os.Getenv("BLANK_SERVICE_REGISTRY_URI"); len(sr) > 0 {
				srAddress = &sr
			}

			if srPort := os.Getenv("BLANK_SERVICE_REGISTRY_PORT"); len(srPort) > 0 {
				addr := "ws://localhost:" + srPort
				srAddress = &addr
			}

			log.Info("Router started")
			settings.SRAddress = *srAddress
			settings.SRHTTPAddress = "http:" + strings.TrimPrefix(*srAddress, "ws:")
			go internet.Init(sr.SR(), version)
			intranet.Init(true)
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
