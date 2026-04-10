package main

import (
	"context"
	"embed"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"golocalthreat/internal/app"
	"golocalthreat/internal/bootstrap"
	"golocalthreat/internal/providers/esi"
	"golocalthreat/internal/providers/zkill"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

const (
	defaultESIBaseURL   = "https://esi.evetech.net/latest"
	defaultZKillBaseURL = "https://zkillboard.com"
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
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	esiProvider, zkillProvider, providerMode := buildProviders(logger)
	logger.Info("providers configured", "mode", providerMode)

	service := app.NewAppServiceWithProviders(esiProvider, zkillProvider)
	service.SetBuildInfo(app.BuildInfo{Version: meta.Version, Commit: meta.Commit, Date: meta.Date})

	err := wails.Run(&options.App{
		Title:            wiring.AppName,
		Width:            1280,
		Height:           800,
		MinWidth:         1024,
		MinHeight:        720,
		AssetServer:      &assetserver.Options{Assets: assets},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        service.Startup,
		OnShutdown:       service.Shutdown,
		Bind:             []interface{}{service},
	})
	if err != nil {
		fmt.Printf("wails startup failed (%s %s %s): %v\n", meta.Version, meta.Commit, meta.Date, err)
	}
}

func buildProviders(logger *slog.Logger) (esi.Provider, app.ZKillProvider, string) {
	if os.Getenv("GOLT_PROVIDER_MODE") == "noop" {
		logger.Warn("startup provider mode selected", "mode", "noop")
		return esi.NoopProvider{}, zkill.NewProvider(noopStatsClient{}, noopKillmailClient{}), "noop"
	}

	timeout := 5 * time.Second
	if raw := os.Getenv("GOLT_PROVIDER_TIMEOUT"); raw != "" {
		parsed, err := time.ParseDuration(raw)
		if err != nil || parsed <= 0 {
			logger.Warn("invalid provider timeout; using default", "value", raw, "default", timeout.String())
		} else {
			timeout = parsed
		}
	}

	esiBaseURL := valueOrDefault(os.Getenv("GOLT_ESI_BASE_URL"), defaultESIBaseURL)
	zkillBaseURL := valueOrDefault(os.Getenv("GOLT_ZKILL_BASE_URL"), defaultZKillBaseURL)

	httpClient := &http.Client{Timeout: timeout}
	esiProvider := esi.NewClient(esiBaseURL).WithHTTPClient(httpClient)
	statsClient := zkill.NewStatsClient(zkillBaseURL).WithHTTPClient(httpClient)
	killmailClient := zkill.NewKillmailClient(zkillBaseURL).WithHTTPClient(httpClient)
	logger.Info("startup provider mode selected", "mode", "real", "esi_base_url", esiBaseURL, "zkill_base_url", zkillBaseURL, "timeout", timeout.String())
	return esiProvider, zkill.NewProvider(statsClient, killmailClient), "real"
}

func valueOrDefault(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}

type noopStatsClient struct{}

func (noopStatsClient) FetchSummary(_ context.Context, _ int64) (zkill.SummaryRow, error) {
	return zkill.SummaryRow{}, nil
}

type noopKillmailClient struct{}

func (noopKillmailClient) FetchRecentByCharacter(_ context.Context, _ int64, _ int) ([]zkill.Killmail, error) {
	return nil, nil
}
