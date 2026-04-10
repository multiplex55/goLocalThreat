package app

import (
	"context"
	"testing"

	"golocalthreat/internal/scoring"
)

func TestNewAppServiceConstructorInvariants(t *testing.T) {
	svc := NewAppService()
	if svc == nil {
		t.Fatal("expected service instance")
	}
	if svc.esi == nil {
		t.Fatal("expected non-nil esi provider")
	}
	if svc.zkill == nil {
		t.Fatal("expected non-nil zkill provider")
	}
	if svc.logger == nil {
		t.Fatal("expected logger")
	}
	if svc.sessions == nil {
		t.Fatal("expected sessions map initialized")
	}
	if svc.settings.RefreshInterval != 30 {
		t.Fatalf("expected default refresh interval=30, got %d", svc.settings.RefreshInterval)
	}
	if svc.settings.Scoring.Weights.Activity != scoring.DefaultSettings.Weights.Activity {
		t.Fatalf("unexpected default activity weight: got %.2f want %.2f", svc.settings.Scoring.Weights.Activity, scoring.DefaultSettings.Weights.Activity)
	}
	if svc.settings.Scoring.Thresholds.Critical != scoring.DefaultSettings.Thresholds.Critical {
		t.Fatalf("unexpected critical threshold: got %.2f want %.2f", svc.settings.Scoring.Thresholds.Critical, scoring.DefaultSettings.Thresholds.Critical)
	}
}

func TestBuildMetadataPlumbing(t *testing.T) {
	svc := NewAppService()

	meta := BuildInfo{Version: "1.2.3", Commit: "abc123", Date: "2026-04-10T00:00:00Z"}
	svc.SetBuildInfo(meta)
	got := svc.GetBuildInfo()
	if got != meta {
		t.Fatalf("build info mismatch: got %+v want %+v", got, meta)
	}
}

func TestStartupAndShutdownLifecycle(t *testing.T) {
	svc := NewAppService()
	ctx := context.WithValue(context.Background(), "k", "v")

	svc.Startup(ctx)
	if svc.ctx == nil {
		t.Fatal("expected startup context to be initialized")
	}
	if got := svc.ctx.Value("k"); got != "v" {
		t.Fatalf("expected startup context value to round-trip, got %v", got)
	}

	svc.Shutdown(context.Background())
	if svc.ctx != nil {
		t.Fatal("expected context to be nil after shutdown")
	}

	// Graceful no-op behavior when shutdown is called repeatedly.
	svc.Shutdown(context.Background())
	if svc.ctx != nil {
		t.Fatal("expected repeated shutdown to remain no-op")
	}
}
