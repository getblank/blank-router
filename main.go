package main

import (
	"fmt"
	"os"
	"strings"

	log "github.com/Sirupsen/logrus"
	"github.com/gemnasium/logrus-graylog-hook"
	"github.com/spf13/cobra"

	"github.com/getblank/blank-router/internet"
	"github.com/getblank/blank-router/intranet"
	"github.com/getblank/blank-router/settings"
)

var (
	buildTime string
	gitHash   string
	version   = "0.1.43"
)

func main() {
	if os.Getenv("BLANK_DEBUG") != "" {
		log.SetLevel(log.DebugLevel)
		settings.DevMode = true
	}
	log.SetFormatter(&log.JSONFormatter{})
	if os.Getenv("GRAYLOG2_HOST") != "" {
		host := os.Getenv("GRAYLOG2_HOST")
		port := os.Getenv("GRAYLOG2_PORT")
		if port == "" {
			port = "12201"
		}
		source := os.Getenv("GRAYLOG2_SOURCE")
		if source == "" {
			source = "blank-router"
		}
		hook := graylog.NewGraylogHook(host+":"+port, map[string]interface{}{"source-app": source})
		log.AddHook(hook)
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
			go internet.Init(version)
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
