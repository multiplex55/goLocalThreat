package store

import (
	"testing"

	"golocalthreat/internal/domain"
)

func TestValidateSettingsWeightsAndThresholds(t *testing.T) {
	valid := domain.Settings{
		RefreshInterval: 30,
		Scoring: domain.ScoringSettings{
			Weights:    domain.ScoringWeights{Activity: 1, Lethality: 1, SoloRisk: 1, Recentness: 1, Context: 1, Uncertainty: 1},
			Thresholds: domain.ScoringThresholds{Low: 10, Medium: 30, High: 60, Critical: 90},
		},
	}
	if err := ValidateSettings(valid); err != nil {
		t.Fatalf("valid settings should pass: %v", err)
	}

	invalidWeight := valid
	invalidWeight.Scoring.Weights.Activity = -0.1
	if err := ValidateSettings(invalidWeight); err == nil {
		t.Fatalf("expected negative weight validation error")
	}

	invalidThreshold := valid
	invalidThreshold.Scoring.Thresholds = domain.ScoringThresholds{Low: 20, Medium: 10, High: 30, Critical: 40}
	if err := ValidateSettings(invalidThreshold); err == nil {
		t.Fatalf("expected threshold ordering validation error")
	}
}
