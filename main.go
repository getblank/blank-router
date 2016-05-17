package main

import (
	"net/http"
	"os"

	"github.com/labstack/echo"
	"github.com/labstack/echo/engine/standard"
	"github.com/spf13/cobra"

	"github.com/getblank/blank-router/intranet"
)

var (
	srAddress string
)

func main() {
	rootCmd := &cobra.Command{
		Use:   "router",
		Short: "Router for Blank platform",
		Long:  "The next generation of web applications. This is the router subsytem.",
		Run: func(cmd *cobra.Command, args []string) {
			run()
		},
	}
	srAddress = *(rootCmd.PersistentFlags().StringP("service-registry", "s", "ws://localhost:1234", "Service registry uri"))

	if err := rootCmd.Execute(); err != nil {
		println(err.Error())
		os.Exit(-1)
	}
}

func run() {
	go intranet.Init(srAddress)

	e := echo.New()
	e.GET("/", func(c echo.Context) error {
		return c.String(http.StatusOK, "Hello, World!")
	})
	e.Run(standard.New(":8080"))
}
