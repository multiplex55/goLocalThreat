package scoring

import (
	"math"
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
	if result.DataCompleteness >= 1.0 {
		t.Fatalf("expected reduced completeness for unknown inputs, got %.2f", result.DataCompleteness)
	}
	if result.AssessmentState != "insufficient-data" {
		t.Fatalf("expected insufficient-data state, got %q", result.AssessmentState)
	}
	var foundUnknown bool
	for _, b := range result.Breakdown {
		if b.Component == "activity" && b.Unknown {
			foundUnknown = true
		}
	}
	if !foundUnknown {
		t.Fatalf("expected unknown activity component")
	}
}

func TestPartialDataHighVolumeDoesNotCollapseToLowBaseline(t *testing.T) {
	engine := NewEngine(DefaultSettings)
	highVolumePartial := EnrichedPilotInput{
		SnapshotAt:   time.Date(2026, 4, 10, 0, 0, 0, 0, time.UTC),
		RecentKills:  OptionalFloat{Value: 24, Known: true},
		RecentLosses: OptionalFloat{Value: 8, Known: true},
		DangerRatio:  OptionalFloat{Value: 1.8, Known: true},
	}
	result := engine.Score(highVolumePartial)
	if result.ThreatBand == "low" || result.ThreatBand == "minimal" {
		t.Fatalf("expected high-volume partial profile to avoid low baseline band, got %q (score %.2f)", result.ThreatBand, result.ThreatScore)
	}
	if result.AssessmentState != "partial-data" {
		t.Fatalf("expected partial-data state, got %q", result.AssessmentState)
	}
}

func TestSameRawScoreDifferentDataQualityChangesConfidence(t *testing.T) {
	engine := NewEngine(DefaultSettings)
	hostile := true
	full := EnrichedPilotInput{
		SnapshotAt:     time.Date(2026, 4, 10, 0, 0, 0, 0, time.UTC),
		RecentKills:    OptionalFloat{Value: 12, Known: true},
		RecentLosses:   OptionalFloat{Value: 3, Known: true},
		DangerRatio:    OptionalFloat{Value: 1.5, Known: true},
		AvgAttackers:   OptionalFloat{Value: 2, Known: true},
		SoloKillRatio:  OptionalFloat{Value: 0.9441667, Known: true},
		LastActivityAt: OptionalTime{Value: time.Date(2026, 4, 5, 7, 58, 48, 0, time.UTC), Known: true},
		SecurityStatus: OptionalFloat{Value: -1.1083333, Known: true},
		InHostileSpace: &hostile,
	}
	partial := EnrichedPilotInput{
		SnapshotAt:   full.SnapshotAt,
		RecentKills:  full.RecentKills,
		RecentLosses: full.RecentLosses,
		DangerRatio:  full.DangerRatio,
	}
	fullRes := engine.Score(full)
	partialRes := engine.Score(partial)
	if math.Abs(fullRes.RawThreatScore-partialRes.RawThreatScore) > 0.01 {
		t.Fatalf("expected equal raw score, full=%.2f partial=%.2f", fullRes.RawThreatScore, partialRes.RawThreatScore)
	}
	if fullRes.Confidence <= partialRes.Confidence {
		t.Fatalf("expected lower confidence with weaker data quality, full=%.2f partial=%.2f", fullRes.Confidence, partialRes.Confidence)
	}
}

func TestUnknownFieldsDoNotForceIdenticalBandsAcrossProfiles(t *testing.T) {
	engine := NewEngine(DefaultSettings)
	highActivity := EnrichedPilotInput{
		SnapshotAt:   time.Date(2026, 4, 10, 0, 0, 0, 0, time.UTC),
		RecentKills:  OptionalFloat{Value: 18, Known: true},
		RecentLosses: OptionalFloat{Value: 6, Known: true},
		DangerRatio:  OptionalFloat{Value: 1.7, Known: true},
	}
	lowActivity := EnrichedPilotInput{
		SnapshotAt:   highActivity.SnapshotAt,
		RecentKills:  OptionalFloat{Value: 1, Known: true},
		RecentLosses: OptionalFloat{Value: 3, Known: true},
		DangerRatio:  OptionalFloat{Value: 0.4, Known: true},
	}
	highRes := engine.Score(highActivity)
	lowRes := engine.Score(lowActivity)
	if highRes.ThreatBand == lowRes.ThreatBand {
		t.Fatalf("expected distinct bands despite shared unknown fields, high=%q low=%q", highRes.ThreatBand, lowRes.ThreatBand)
	}
}
