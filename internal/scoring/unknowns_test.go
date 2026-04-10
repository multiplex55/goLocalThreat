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
