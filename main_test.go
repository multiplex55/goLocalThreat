package main

import (
	"context"
	"io"
	"log/slog"
	"strings"
	"testing"

	"golocalthreat/internal/bootstrap"
)

func TestBuildProvidersNoopMode(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	cfg := bootstrap.ProviderConfig{Mode: bootstrap.ProviderModeNoop}

	esiProvider, zkillProvider, mode, err := buildProviders(logger, cfg)
	if err != nil {
		t.Fatalf("buildProviders returned error: %v", err)
	}
	if mode != "noop" {
		t.Fatalf("expected noop mode, got %q", mode)
	}
	if esiProvider == nil || zkillProvider == nil {
		t.Fatal("expected non-nil noop providers")
	}

	if _, err := zkillProvider.FetchSummary(context.Background(), 1); err != nil {
		t.Fatalf("noop zkill summary should not error, got %v", err)
	}
}

func TestBuildProvidersRealModeWiresRealProviders(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	cfg := bootstrap.ProviderConfig{
		Mode:         bootstrap.ProviderModeReal,
		Timeout:      bootstrap.DefaultProviderTimeout,
		ESIBaseURL:   "https://esi.evetech.net/latest",
		ZKillBaseURL: "https://zkillboard.com",
	}

	esiProvider, zkillProvider, mode, err := buildProviders(logger, cfg)
	if err != nil {
		t.Fatalf("buildProviders returned error: %v", err)
	}
	if mode != "real" {
		t.Fatalf("expected real mode, got %q", mode)
	}
	if esiProvider == nil || zkillProvider == nil {
		t.Fatal("expected real providers")
	}

	// Smoke-check wiring uses concrete providers that accept calls.
	if _, err := zkillProvider.FetchRecentByCharacter(context.Background(), 0, 1); err == nil {
		// character id 0 is invalid for real killmail client and should fail.
		t.Fatal("expected composed real killmail provider to validate character id")
	}
}

func TestBuildProvidersRealModeMissingConfigReturnsError(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	cfg := bootstrap.ProviderConfig{
		Mode:    bootstrap.ProviderModeReal,
		Timeout: bootstrap.DefaultProviderTimeout,
	}

	_, _, _, err := buildProviders(logger, cfg)
	if err == nil {
		t.Fatal("expected startup error for missing real-mode provider config")
	}
}

func TestInitializeAppServiceIncludesConfigGuidanceForWailsGenerateStartup(t *testing.T) {
	t.Setenv("PROVIDER_MODE", "real")
	t.Setenv("ESI_BASE_URL", "")
	t.Setenv("GOLT_ESI_BASE_URL", "")
	t.Setenv("ZKILL_BASE_URL", "https://zkillboard.com")
	t.Setenv("GOLT_ZKILL_BASE_URL", "")

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	meta := bootstrap.ResolveBuildMetadata("", "", "")

	_, err := initializeAppService(logger, meta)
	if err == nil {
		t.Fatal("expected startup initialization to fail for missing ESI base URL")
	}

	for _, expected := range []string{
		"startup configuration validation failed",
		"ESI_BASE_URL",
		"GOLT_ESI_BASE_URL",
		"set ESI_BASE_URL=",
		"export ESI_BASE_URL=",
	} {
		if !strings.Contains(err.Error(), expected) {
			t.Fatalf("expected error to contain %q, got %q", expected, err.Error())
		}
	}
}
