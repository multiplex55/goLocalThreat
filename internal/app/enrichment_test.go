package app

import (
	"context"
	"reflect"
	"testing"
	"time"

	"golocalthreat/internal/domain"
	"golocalthreat/internal/providers/zkill"
)

func TestSelectDetailFetchTargetsPolicy(t *testing.T) {
	pilots := []domain.PilotThreatRecord{
		{Identity: domain.CharacterIdentity{CharacterID: 1}, Threat: domain.ThreatBreakdown{Total: 10, RecentKills: 2, RecentLosses: 1}},
		{Identity: domain.CharacterIdentity{CharacterID: 2}, Threat: domain.ThreatBreakdown{Total: 9, RecentKills: 0, RecentLosses: 0}},
		{Identity: domain.CharacterIdentity{CharacterID: 3}, Threat: domain.ThreatBreakdown{Total: 8, RecentKills: 3, RecentLosses: 1}},
		{Identity: domain.CharacterIdentity{CharacterID: 4}, Threat: domain.ThreatBreakdown{Total: 1, RecentKills: 0, RecentLosses: 0}},
	}

	got := SelectDetailFetchTargets(pilots, 2, 3, false)
	want := []int64{1, 2, 3, 4}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("targets mismatch\nwant=%v\ngot=%v", want, got)
	}
}

func TestSelectDetailFetchTargetsExplicitRefresh(t *testing.T) {
	pilots := []domain.PilotThreatRecord{
		{Identity: domain.CharacterIdentity{CharacterID: 11}, Threat: domain.ThreatBreakdown{Total: 1}},
		{Identity: domain.CharacterIdentity{CharacterID: 12}, Threat: domain.ThreatBreakdown{Total: 2}},
	}
	got := SelectDetailFetchTargets(pilots, 1, 0, true)
	want := []int64{11, 12}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("explicit refresh should select all, got %v", got)
	}
}

type detailOnlyZKillProvider struct {
	details map[int64][]zkill.Killmail
}

func (m detailOnlyZKillProvider) FetchSummary(context.Context, int64) (zkill.SummaryRow, error) {
	return zkill.SummaryRow{}, nil
}

func (m detailOnlyZKillProvider) FetchRecentByCharacter(_ context.Context, characterID int64, _ int) ([]zkill.Killmail, error) {
	return m.details[characterID], nil
}

func TestFetchDetailsInvalidTimesStillPopulateNonTimeDerivations(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	svc := NewAppServiceWithProviders(nil, detailOnlyZKillProvider{
		details: map[int64][]zkill.Killmail{
			101: {
				{KillID: 1, VictimID: 77, Attackers: 1, ShipTypeID: 111, OccurredAtInvalid: true},
				{KillID: 2, VictimID: 77, Attackers: 3, ShipTypeID: 111, OccurredAt: now},
				{KillID: 3, VictimID: 101, Attackers: 2, ShipTypeID: 222, OccurredAtInvalid: true},
			},
		},
	})
	pilots := []domain.PilotThreatRecord{{
		Identity: domain.CharacterIdentity{CharacterID: 101, Name: "Alice"},
		Threat:   domain.ThreatBreakdown{RecentKills: 4},
	}}

	detailEvidence, warnings := svc.fetchDetails(context.Background(), pilots, []int64{101})
	merged, freshness, provenance := mergePilotThreat(zkill.SummaryRow{RecentKills: 4}, detailEvidence[101], svc.settings.RefreshInterval, now)
	if merged.MainShip != "ShipType #111" {
		t.Fatalf("expected main ship derived from detail rows, got %q", merged.MainShip)
	}
	if merged.SoloPercent != 50 {
		t.Fatalf("expected solo percentage to include invalid-time kills, got %v", merged.SoloPercent)
	}
	if merged.AvgGangSize != 2 {
		t.Fatalf("expected avg gang size to include invalid-time kills, got %v", merged.AvgGangSize)
	}
	if merged.Notes == "" {
		t.Fatalf("expected notes to be populated")
	}
	if freshness.Source == "" || provenance == "" {
		t.Fatalf("expected provenance/freshness source to be populated")
	}
	foundInvalid := false
	for _, w := range warnings {
		if w.Code == "DETAIL_TIME_INVALID" && w.CharacterID != nil && *w.CharacterID == 101 {
			foundInvalid = true
			if w.Metadata["coalesceKey"] != "zkill:detail_time_invalid" {
				t.Fatalf("expected coalesce key metadata, got %#v", w.Metadata)
			}
			if w.Metadata["timestampFailures"] != "2" || w.Metadata["timestampMissing"] != "0" || w.Metadata["timestampUnparseable"] != "2" {
				t.Fatalf("unexpected timestamp metadata: %#v", w.Metadata)
			}
		}
	}
	if !foundInvalid {
		t.Fatalf("expected pilot-scoped DETAIL_TIME_INVALID warning, got %#v", warnings)
	}
}

func TestFetchDetailsNoValidTimesWarnsButKeepsNonTimeEnrichment(t *testing.T) {
	svc := NewAppServiceWithProviders(nil, detailOnlyZKillProvider{
		details: map[int64][]zkill.Killmail{
			303: {
				{KillID: 1, VictimID: 11, Attackers: 2, ShipTypeID: 900, OccurredAtInvalid: true},
				{KillID: 2, VictimID: 12, Attackers: 1, ShipTypeID: 900, OccurredAtInvalid: true},
			},
		},
	})
	pilots := []domain.PilotThreatRecord{{
		Identity: domain.CharacterIdentity{CharacterID: 303, Name: "Pilot 303"},
		Threat:   domain.ThreatBreakdown{RecentKills: 2},
	}}

	detailEvidence, warnings := svc.fetchDetails(context.Background(), pilots, []int64{303})
	merged, _, _ := mergePilotThreat(zkill.SummaryRow{RecentKills: 2}, detailEvidence[303], svc.settings.RefreshInterval, time.Now().UTC())
	if merged.MainShip != "ShipType #900" {
		t.Fatalf("expected non-time enrichment to remain, got %q", merged.MainShip)
	}
	if merged.SoloPercent != 50 {
		t.Fatalf("expected solo percent to be preserved, got %v", merged.SoloPercent)
	}
	foundInvalid := false
	foundMissing := false
	for _, w := range warnings {
		if w.CharacterID != nil && *w.CharacterID == 303 && w.Code == "DETAIL_TIME_INVALID" {
			foundInvalid = true
			if w.Metadata["timestampMissing"] != "0" {
				t.Fatalf("expected missing=0 for legacy invalid rows, got %#v", w.Metadata)
			}
		}
		if w.CharacterID != nil && *w.CharacterID == 303 && w.Code == "DETAIL_TIME_MISSING" {
			foundMissing = true
			if w.Metadata["coalesceKey"] != "zkill:detail_time_missing" || w.Metadata["timestampFailures"] != "2" {
				t.Fatalf("expected coalescing metadata on missing warning, got %#v", w.Metadata)
			}
		}
	}
	if !foundInvalid || !foundMissing {
		t.Fatalf("expected pilot-scoped DETAIL_TIME_INVALID and DETAIL_TIME_MISSING warnings, got %#v", warnings)
	}
}
