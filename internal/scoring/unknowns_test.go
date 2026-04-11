package scoring

import (
	"strings"
	"testing"
	"time"
)

func TestUnknownStateAndUncertaintyPenalty(t *testing.T) {
	engine := NewEngine(DefaultSettings)
	input := EnrichedPilotInput{SnapshotAt: time.Date(2026, 4, 10, 0, 0, 0, 0, time.UTC)}
	result := engine.Score(input)

	if result.Confidence >= 1.0 {
		t.Fatalf("expected reduced confidence for unknown inputs, got %.2f", result.Confidence)
	}
	var foundUnknown bool
	for _, b := range result.Breakdown {
		if b.Component == "activity" && b.Unknown {
			foundUnknown = true
		}
		if b.Component == "uncertainty" && b.Contribution <= 0 {
			t.Fatalf("expected uncertainty contribution to be positive")
		}
	}
	if !foundUnknown {
		t.Fatalf("expected unknown activity component")
	}
	if len(result.ThreatReasons) == 0 || !strings.Contains(strings.ToLower(result.ThreatReasons[0]), "uncertainty") {
		t.Fatalf("expected uncertainty to appear in reasons: %#v", result.ThreatReasons)
	}
}

func TestPartialInputsKeepDifferentiatedScoresWithLowerConfidence(t *testing.T) {
	engine := NewEngine(DefaultSettings)
	base := EnrichedPilotInput{
		SnapshotAt:   time.Date(2026, 4, 10, 0, 0, 0, 0, time.UTC),
		RecentKills:  OptionalFloat{Value: 9, Known: true},
		RecentLosses: OptionalFloat{Value: 1, Known: true},
		DangerRatio:  OptionalFloat{Value: 1.4, Known: true},
	}
	lower := base
	lower.RecentKills = OptionalFloat{Value: 2, Known: true}
	lower.RecentLosses = OptionalFloat{Value: 4, Known: true}

	highRes := engine.Score(base)
	lowRes := engine.Score(lower)

	if highRes.ThreatScore <= lowRes.ThreatScore {
		t.Fatalf("expected differentiated scores with partial inputs, high=%.2f low=%.2f", highRes.ThreatScore, lowRes.ThreatScore)
	}
	if highRes.Confidence >= 1.0 || lowRes.Confidence >= 1.0 {
		t.Fatalf("expected confidence degradation for partial inputs, got high=%.2f low=%.2f", highRes.Confidence, lowRes.Confidence)
	}
}
