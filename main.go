package main

import (
	"context"
	"embed"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"golocalthreat/internal/app"
	"golocalthreat/internal/bootstrap"
	"golocalthreat/internal/providers/esi"
	"golocalthreat/internal/providers/zkill"

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
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	providerConfig, err := bootstrap.LoadProviderConfigFromEnv()
	if err != nil {
		logger.Error("startup configuration error", "error", err)
		os.Exit(1)
	}

	esiProvider, zkillProvider, _, err := buildProviders(logger, providerConfig)
	if err != nil {
		logger.Error("provider startup failed", "error", err)
		os.Exit(1)
	}

	service := app.NewAppServiceWithProviders(esiProvider, zkillProvider)
	service.SetBuildInfo(app.BuildInfo{Version: meta.Version, Commit: meta.Commit, Date: meta.Date})

	err = wails.Run(&options.App{
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

func buildProviders(logger *slog.Logger, cfg bootstrap.ProviderConfig) (esi.Provider, app.ZKillProvider, string, error) {
	if cfg.Mode == bootstrap.ProviderModeNoop {
		esiProvider := esi.NoopProvider{}
		zkillProvider := zkill.NewProvider(noopStatsClient{}, noopKillmailClient{})
		logger.Warn("startup provider mode selected", "mode", "noop", "esi_provider", fmt.Sprintf("%T", esiProvider), "zkill_provider", fmt.Sprintf("%T", zkillProvider))
		return esiProvider, zkillProvider, "noop", nil
	}

	if cfg.Mode != bootstrap.ProviderModeReal {
		return nil, nil, "", fmt.Errorf("unsupported provider mode %q", cfg.Mode)
	}
	if cfg.ESIBaseURL == "" || cfg.ZKillBaseURL == "" {
		return nil, nil, "", fmt.Errorf("real mode requires non-empty ESI and zKill base URLs")
	}

	httpClient := &http.Client{Timeout: cfg.Timeout}
	esiProvider := esi.NewClient(cfg.ESIBaseURL).WithHTTPClient(httpClient)
	statsClient := zkill.NewStatsClient(cfg.ZKillBaseURL).WithHTTPClient(httpClient)
	killmailClient := zkill.NewKillmailClient(cfg.ZKillBaseURL).WithHTTPClient(httpClient)
	zkillProvider := zkill.NewProvider(statsClient, killmailClient)

	logger.Info("startup provider mode selected",
		"mode", "real",
		"esi_provider", fmt.Sprintf("%T", esiProvider),
		"zkill_provider", fmt.Sprintf("%T", zkillProvider),
		"esi_base_url", cfg.ESIBaseURL,
		"zkill_base_url", cfg.ZKillBaseURL,
		"timeout", cfg.Timeout.String(),
	)
	return esiProvider, zkillProvider, "real", nil
}

type noopStatsClient struct{}

func (noopStatsClient) FetchSummary(_ context.Context, _ int64) (zkill.SummaryRow, error) {
	return zkill.SummaryRow{}, nil
}

type noopKillmailClient struct{}

func (noopKillmailClient) FetchRecentByCharacter(_ context.Context, _ int64, _ int) ([]zkill.Killmail, error) {
	return nil, nil
}
