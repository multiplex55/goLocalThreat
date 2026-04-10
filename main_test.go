package main

import (
	"context"
	"io"
	"log/slog"
	"testing"
)

func TestBuildProvidersNoopMode(t *testing.T) {
	t.Setenv("GOLT_PROVIDER_MODE", "noop")
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	esiProvider, zkillProvider, mode := buildProviders(logger)
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

func TestBuildProvidersInvalidTimeoutFallsBack(t *testing.T) {
	t.Setenv("GOLT_PROVIDER_MODE", "")
	t.Setenv("GOLT_PROVIDER_TIMEOUT", "bad-timeout")
	t.Setenv("GOLT_ESI_BASE_URL", "")
	t.Setenv("GOLT_ZKILL_BASE_URL", "")
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	esiProvider, zkillProvider, mode := buildProviders(logger)
	if mode != "real" {
		t.Fatalf("expected real mode fallback, got %q", mode)
	}
	if esiProvider == nil || zkillProvider == nil {
		t.Fatal("expected real providers with fallback defaults")
	}

	// Smoke-check wiring uses concrete providers that accept calls.
	if _, err := zkillProvider.FetchRecentByCharacter(context.Background(), 0, 1); err == nil {
		// character id 0 is invalid for real killmail client and should fail.
		t.Fatal("expected composed real killmail provider to validate character id")
	}
}

func TestValueOrDefault(t *testing.T) {
	if got := valueOrDefault("", "fallback"); got != "fallback" {
		t.Fatalf("expected fallback value, got %q", got)
	}
	if got := valueOrDefault("set", "fallback"); got != "set" {
		t.Fatalf("expected set value, got %q", got)
	}
}
