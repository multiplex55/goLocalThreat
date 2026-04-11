package scoring

import (
	"testing"
	"time"
)

func TestScoreDistributionAcrossFixtureCohort(t *testing.T) {
	engine := NewEngine(DefaultSettings)
	hostile := true
	nonHostile := false
	cohort := []EnrichedPilotInput{
		{
			SnapshotAt:     time.Date(2026, 4, 10, 0, 0, 0, 0, time.UTC),
			RecentKills:    OptionalFloat{Value: 2, Known: true},
			RecentLosses:   OptionalFloat{Value: 2, Known: true},
			DangerRatio:    OptionalFloat{Value: 0.4, Known: true},
			AvgAttackers:   OptionalFloat{Value: 6, Known: true},
			SoloKillRatio:  OptionalFloat{Value: 0.1, Known: true},
			LastActivityAt: OptionalTime{Value: time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC), Known: true},
			SecurityStatus: OptionalFloat{Value: 4.0, Known: true},
			InHostileSpace: &nonHostile,
		},
		{
			SnapshotAt:     time.Date(2026, 4, 10, 0, 0, 0, 0, time.UTC),
			RecentKills:    OptionalFloat{Value: 7, Known: true},
			RecentLosses:   OptionalFloat{Value: 5, Known: true},
			DangerRatio:    OptionalFloat{Value: 0.9, Known: true},
			AvgAttackers:   OptionalFloat{Value: 3.5, Known: true},
			SoloKillRatio:  OptionalFloat{Value: 0.2, Known: true},
			LastActivityAt: OptionalTime{Value: time.Date(2026, 4, 8, 0, 0, 0, 0, time.UTC), Known: true},
			SecurityStatus: OptionalFloat{Value: 0.5, Known: true},
			InHostileSpace: &hostile,
		},
		{
			SnapshotAt:     time.Date(2026, 4, 10, 0, 0, 0, 0, time.UTC),
			RecentKills:    OptionalFloat{Value: 30, Known: true},
			RecentLosses:   OptionalFloat{Value: 5, Known: true},
			DangerRatio:    OptionalFloat{Value: 2, Known: true},
			AvgAttackers:   OptionalFloat{Value: 1.5, Known: true},
			SoloKillRatio:  OptionalFloat{Value: 0.7, Known: true},
			LastActivityAt: OptionalTime{Value: time.Date(2026, 4, 9, 8, 0, 0, 0, time.UTC), Known: true},
			SecurityStatus: OptionalFloat{Value: -4.5, Known: true},
			InHostileSpace: &hostile,
		},
	}

	counts := map[string]int{}
	for _, input := range cohort {
		res := engine.Score(input)
		counts[res.ThreatBand]++
	}

	if counts["low"] == 0 {
		t.Fatalf("expected at least one low-band pilot in cohort; counts=%v", counts)
	}
	if counts["medium"] == 0 {
		t.Fatalf("expected at least one medium-band pilot in cohort; counts=%v", counts)
	}
	if counts["high"] == 0 && counts["critical"] == 0 {
		t.Fatalf("expected at least one high/critical pilot in cohort; counts=%v", counts)
	}
}
