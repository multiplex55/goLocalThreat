package main

import (
	"embed"
	"fmt"

	"golocalthreat/internal/app"
	"golocalthreat/internal/bootstrap"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

var (
	version string
	commit  string
	date    string
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	meta := bootstrap.ResolveBuildMetadata(version, commit, date)
	wiring := bootstrap.DefaultStartupWiring()
	service := app.NewAppService()

	err := wails.Run(&options.App{
		Title:            wiring.AppName,
		Width:            1280,
		Height:           800,
		MinWidth:         1024,
		MinHeight:        720,
		AssetServer:      &assetserver.Options{Assets: assets},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		Bind:             []interface{}{service},
	})
	if err != nil {
		fmt.Printf("wails startup failed (%s %s %s): %v\n", meta.Version, meta.Commit, meta.Date, err)
	}
}
