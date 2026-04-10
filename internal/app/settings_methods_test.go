package app_test

import (
	"strings"
	"testing"

	"golocalthreat/internal/app"
)

func TestSaveAndLoadSettingsValidationPath(t *testing.T) {
	svc := app.NewAppService()

	loaded, err := svc.LoadSettings()
	if err != nil {
		t.Fatalf("LoadSettings err: %v", err)
	}

	loaded.Scoring.Weights.Activity = 0
	loaded.Scoring.Weights.Lethality = 0
	loaded.Scoring.Weights.SoloRisk = 0
	loaded.Scoring.Weights.Recentness = 0
	loaded.Scoring.Weights.Context = 0
	loaded.Scoring.Weights.Uncertainty = 0

	_, err = svc.SaveSettings(loaded)
	if err == nil {
		t.Fatal("expected validation error for zeroed scoring weights")
	}
	if !strings.Contains(err.Error(), "at least one scoring weight must be positive") {
		t.Fatalf("unexpected validation error: %v", err)
	}

	loaded.Scoring.Weights.Activity = 1
	saved, err := svc.SaveSettings(loaded)
	if err != nil {
		t.Fatalf("SaveSettings err: %v", err)
	}

	reloaded, err := svc.LoadSettings()
	if err != nil {
		t.Fatalf("LoadSettings err: %v", err)
	}

	if saved.Scoring.Weights.Activity != reloaded.Scoring.Weights.Activity {
		t.Fatalf("expected SaveSettings value to persist, got %v want %v", reloaded.Scoring.Weights.Activity, saved.Scoring.Weights.Activity)
	}
}
