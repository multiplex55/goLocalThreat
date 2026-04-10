package scoring

import (
	"testing"
	"time"
)

func TestBreakdownExplanationCompletenessAndStableOrdering(t *testing.T) {
	hostile := false
	input := EnrichedPilotInput{
		SnapshotAt:     time.Date(2026, 4, 10, 12, 0, 0, 0, time.UTC),
		RecentKills:    OptionalFloat{Value: 4, Known: true},
		RecentLosses:   OptionalFloat{Value: 4, Known: true},
		DangerRatio:    OptionalFloat{Value: 1.0, Known: true},
		AvgAttackers:   OptionalFloat{Value: 2.5, Known: true},
		SoloKillRatio:  OptionalFloat{Value: 0.3, Known: true},
		LastActivityAt: OptionalTime{Value: time.Date(2026, 4, 6, 12, 0, 0, 0, time.UTC), Known: true},
		SecurityStatus: OptionalFloat{Value: 1.2, Known: true},
		InHostileSpace: &hostile,
	}
	got := NewEngine(DefaultSettings).Score(input)
	if len(got.Breakdown) != 6 {
		t.Fatalf("expected 6 breakdown items, got %d", len(got.Breakdown))
	}
	lastContribution := 1e9
	for _, b := range got.Breakdown {
		if b.Explanation == "" {
			t.Fatalf("component %s missing explanation", b.Component)
		}
		if b.Contribution > lastContribution {
			t.Fatalf("breakdown not sorted descending by contribution: %#v", got.Breakdown)
		}
		lastContribution = b.Contribution
	}
}
