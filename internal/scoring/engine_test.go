package scoring

import (
	"reflect"
	"testing"
	"time"
)

func TestEngineComponentContributionAndDeterminism(t *testing.T) {
	hostile := true
	input := EnrichedPilotInput{
		SnapshotAt:     time.Date(2026, 4, 10, 12, 0, 0, 0, time.UTC),
		RecentKills:    OptionalFloat{Value: 8, Known: true},
		RecentLosses:   OptionalFloat{Value: 2, Known: true},
		DangerRatio:    OptionalFloat{Value: 1.6, Known: true},
		AvgAttackers:   OptionalFloat{Value: 1.8, Known: true},
		SoloKillRatio:  OptionalFloat{Value: 0.55, Known: true},
		LastActivityAt: OptionalTime{Value: time.Date(2026, 4, 8, 12, 0, 0, 0, time.UTC), Known: true},
		SecurityStatus: OptionalFloat{Value: -3.5, Known: true},
		InHostileSpace: &hostile,
	}
	engine := NewEngine(DefaultSettings)
	first := engine.Score(input)
	second := engine.Score(input)

	if first.ThreatScore <= 0 {
		t.Fatalf("expected positive threat score, got %.2f", first.ThreatScore)
	}
	if first.ThreatBand == "" {
		t.Fatalf("expected threat band")
	}
	if len(first.Breakdown) != 6 {
		t.Fatalf("expected 6 components including uncertainty, got %d", len(first.Breakdown))
	}
	if !reflect.DeepEqual(first, second) {
		t.Fatalf("score should be deterministic\nfirst=%#v\nsecond=%#v", first, second)
	}
}
