package app_test

import (
	"testing"
	"time"

	"golocalthreat/internal/app"
	"golocalthreat/internal/domain"
	"golocalthreat/internal/providers/esi"
	"golocalthreat/internal/providers/zkill"
)

func TestMergeContractSummaryOnlyPilot(t *testing.T) {
	lastActivity := time.Now().UTC().Add(-1 * time.Hour).Truncate(time.Second)
	svc := app.NewAppServiceWithProviders(
		mockESIProvider{resolved: esi.ResolvedNames{Characters: map[string]int64{"Alice": 101}}, idents: []domain.CharacterIdentity{{CharacterID: 101, Name: "Alice"}}},
		mockZKillProvider{summaries: map[int64]zkill.SummaryRow{101: {CharacterID: 101, RecentKills: 4, RecentLosses: 1, DangerRatio: 0.7, LastActivity: lastActivity}}},
	)
	session, err := svc.AnalyzePastedText("Alice")
	if err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}
	p := session.Pilots[0]
	if p.Kills != 4 || p.Losses != 1 {
		t.Fatalf("expected summary baseline, got kills=%d losses=%d", p.Kills, p.Losses)
	}
	if p.Provenance != "summary" || p.Freshness.Source != "summary" {
		t.Fatalf("expected summary provenance, got pilot=%q freshness=%q", p.Provenance, p.Freshness.Source)
	}
}

func TestMergeContractDetailOnlyPilot(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	svc := app.NewAppServiceWithProviders(
		mockESIProvider{resolved: esi.ResolvedNames{Characters: map[string]int64{"Alice": 101}}, idents: []domain.CharacterIdentity{{CharacterID: 101, Name: "Alice"}}},
		mockZKillProvider{details: map[int64][]zkill.Killmail{101: {{KillID: 1, VictimID: 404, Attackers: 1, ShipTypeID: 555, OccurredAt: now}, {KillID: 2, VictimID: 101, Attackers: 3, ShipTypeID: 666, OccurredAt: now.Add(-5 * time.Minute)}}}},
	)
	session, err := svc.AnalyzePastedText("Alice")
	if err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}
	p := session.Pilots[0]
	if p.Kills == 0 || p.Losses == 0 || p.MainShip == "" {
		t.Fatalf("expected detail-derived nonzero outputs, got %#v", p)
	}
}

func TestMergeContractSummaryDetailConflictPrefersDetailAuthoritativeFields(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	svc := app.NewAppServiceWithProviders(
		mockESIProvider{resolved: esi.ResolvedNames{Characters: map[string]int64{"Alice": 101}}, idents: []domain.CharacterIdentity{{CharacterID: 101, Name: "Alice"}}},
		mockZKillProvider{
			summaries: map[int64]zkill.SummaryRow{101: {CharacterID: 101, RecentKills: 9, RecentLosses: 9, DangerRatio: 0.1, LastActivity: now.Add(-2 * time.Hour)}},
			details: map[int64][]zkill.Killmail{101: {{KillID: 1, VictimID: 123, Attackers: 1, ShipTypeID: 777, OccurredAt: now}, {KillID: 2, VictimID: 123, Attackers: 2, ShipTypeID: 777, OccurredAt: now.Add(-2 * time.Minute)}}},
		},
	)
	session, err := svc.AnalyzePastedText("Alice")
	if err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}
	p := session.Pilots[0]
	if p.Kills != 2 || p.Losses != 0 {
		t.Fatalf("expected detail combat volume to override summary, got kills=%d losses=%d", p.Kills, p.Losses)
	}
	if p.MainShip != "ShipType #777" {
		t.Fatalf("expected detail ship override, got %q", p.MainShip)
	}
}

func TestMergeContractPartialTimestampsKeepCombatVolume(t *testing.T) {
	summaryActivity := time.Now().UTC().Add(-80 * time.Minute).Truncate(time.Second)
	svc := app.NewAppServiceWithProviders(
		mockESIProvider{resolved: esi.ResolvedNames{Characters: map[string]int64{"Alice": 101}}, idents: []domain.CharacterIdentity{{CharacterID: 101, Name: "Alice"}}},
		mockZKillProvider{
			summaries: map[int64]zkill.SummaryRow{101: {CharacterID: 101, RecentKills: 1, RecentLosses: 1, DangerRatio: 0.5, LastActivity: summaryActivity}},
			details: map[int64][]zkill.Killmail{101: {{KillID: 1, VictimID: 303, Attackers: 1, ShipTypeID: 888, OccurredAtInvalid: true}, {KillID: 2, VictimID: 101, Attackers: 2, ShipTypeID: 888, OccurredAtInvalid: true}}},
		},
	)
	session, err := svc.AnalyzePastedText("Alice")
	if err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}
	p := session.Pilots[0]
	if p.Kills == 0 || p.Losses == 0 || p.MainShip == "" {
		t.Fatalf("expected non-time detail evidence to survive timestamp degradation, got %#v", p)
	}
	if p.Freshness.DataAsOf != summaryActivity.Format(time.RFC3339Nano) {
		t.Fatalf("expected summary freshness fallback when detail lacks valid times, got %s", p.Freshness.DataAsOf)
	}
}

func TestMergeContractRegressionNoLow8BlankShipCollapse(t *testing.T) {
	svc := app.NewAppServiceWithProviders(
		mockESIProvider{resolved: esi.ResolvedNames{Characters: map[string]int64{"Alice": 101}}, idents: []domain.CharacterIdentity{{CharacterID: 101, Name: "Alice"}}},
		mockZKillProvider{
			summaries: map[int64]zkill.SummaryRow{101: {CharacterID: 101, RecentKills: 0, RecentLosses: 0, DangerRatio: 0}},
			details: map[int64][]zkill.Killmail{101: {{KillID: 1, VictimID: 404, Attackers: 1, ShipTypeID: 999, OccurredAtInvalid: true}, {KillID: 2, VictimID: 404, Attackers: 2, ShipTypeID: 999, OccurredAtInvalid: true}}},
		},
	)
	session, err := svc.AnalyzePastedText("Alice")
	if err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}
	p := session.Pilots[0]
	if p.ThreatBand == "low" && p.MainShip == "" && p.Kills == 0 && p.DangerPct == 0 {
		t.Fatalf("regression: collapsed to low-empty row: %#v", p)
	}
	if p.Kills == 0 || p.MainShip == "" || p.DangerPct == 0 {
		t.Fatalf("expected corrected nonzero outputs from detail fixture, got %#v", p)
	}
}
