package app_test

import (
	"testing"
	"time"

	"golocalthreat/internal/app"
	"golocalthreat/internal/domain"
	"golocalthreat/internal/providers/esi"
	"golocalthreat/internal/providers/zkill"
)

type goldenProfile struct {
	name             string
	charID           int64
	summary          zkill.SummaryRow
	details          []zkill.Killmail
	expectKills      int
	expectLosses     int
	expectDanger     float64
	expectSolo       float64
	expectAvgGang    float64
	expectMainShip   string
	expectLastKill   string
	expectLastLoss   string
	expectBand       string
	expectFreshness  string
	expectProvenance string
}

func TestGoldenFixtureParityProfiles(t *testing.T) {
	profiles := []goldenProfile{
		{
			name:        "Solo",
			charID:      900001,
			summary:     zkill.SummaryRow{CharacterID: 900001, RecentKills: 4, RecentKillsKnown: true, RecentLosses: 1, RecentLossesKnown: true, DangerRatio: 0.80, DangerRatioKnown: true, LastActivity: time.Date(2026, 3, 1, 10, 0, 0, 0, time.UTC)},
			details:     []zkill.Killmail{{KillID: 501, VictimID: 1001, Attackers: 1, ShipTypeID: 17715, OccurredAt: time.Date(2026, 3, 1, 10, 0, 0, 0, time.UTC), TimestampClass: zkill.KillmailTimestampValid}, {KillID: 502, VictimID: 1002, Attackers: 1, ShipTypeID: 17715, OccurredAt: time.Date(2026, 3, 1, 9, 30, 0, 0, time.UTC), TimestampClass: zkill.KillmailTimestampValid}, {KillID: 503, VictimID: 1003, Attackers: 1, ShipTypeID: 17715, OccurredAt: time.Date(2026, 3, 1, 9, 0, 0, 0, time.UTC), TimestampClass: zkill.KillmailTimestampValid}},
			expectKills: 3, expectLosses: 0, expectDanger: 100, expectSolo: 100, expectAvgGang: 1, expectMainShip: "ShipType #17715", expectLastKill: "2026-03-01T10:00:00Z", expectLastLoss: "", expectFreshness: "2026-03-01T10:00:00Z", expectProvenance: "mixed",
		},
		{
			name:        "GangFC",
			charID:      900002,
			summary:     zkill.SummaryRow{CharacterID: 900002, RecentKills: 2, RecentKillsKnown: true, RecentLosses: 2, RecentLossesKnown: true, DangerRatio: 0.5, DangerRatioKnown: true, LastActivity: time.Date(2026, 3, 1, 8, 0, 0, 0, time.UTC)},
			details:     []zkill.Killmail{{KillID: 601, VictimID: 2001, Attackers: 7, ShipTypeID: 22456, OccurredAt: time.Date(2026, 3, 1, 8, 0, 0, 0, time.UTC), TimestampClass: zkill.KillmailTimestampValid}, {KillID: 602, VictimID: 900002, Attackers: 5, ShipTypeID: 22456, OccurredAt: time.Date(2026, 3, 1, 7, 50, 0, 0, time.UTC), TimestampClass: zkill.KillmailTimestampValid}},
			expectKills: 1, expectLosses: 1, expectDanger: 50, expectSolo: 0, expectAvgGang: 7, expectMainShip: "ShipType #22456", expectLastKill: "2026-03-01T08:00:00Z", expectLastLoss: "2026-03-01T07:50:00Z", expectFreshness: "2026-03-01T08:00:00Z", expectProvenance: "mixed",
		},
		{
			name:        "LowActivity",
			charID:      900003,
			summary:     zkill.SummaryRow{CharacterID: 900003, RecentKills: 0, RecentKillsKnown: true, RecentLosses: 0, RecentLossesKnown: true, DangerRatio: 0, DangerRatioKnown: true, LastActivity: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)},
			details:     []zkill.Killmail{},
			expectKills: 0, expectLosses: 0, expectDanger: 0, expectSolo: 0, expectAvgGang: 0, expectMainShip: "", expectLastKill: "", expectLastLoss: "", expectFreshness: "2025-01-01T00:00:00Z", expectProvenance: "summary",
		},
		{
			name:        "RecentKL",
			charID:      900004,
			summary:     zkill.SummaryRow{CharacterID: 900004, RecentKills: 1, RecentKillsKnown: true, RecentLosses: 1, RecentLossesKnown: true, DangerRatio: 0.5, DangerRatioKnown: true, LastActivity: time.Date(2026, 3, 30, 23, 0, 0, 0, time.UTC)},
			details:     []zkill.Killmail{{KillID: 701, VictimID: 3001, Attackers: 2, ShipTypeID: 11174, OccurredAt: time.Date(2026, 3, 30, 23, 0, 0, 0, time.UTC), TimestampClass: zkill.KillmailTimestampValid}, {KillID: 702, VictimID: 900004, Attackers: 3, ShipTypeID: 11174, OccurredAt: time.Date(2026, 3, 30, 22, 45, 0, 0, time.UTC), TimestampClass: zkill.KillmailTimestampValid}},
			expectKills: 1, expectLosses: 1, expectDanger: 50, expectSolo: 0, expectAvgGang: 2, expectMainShip: "ShipType #11174", expectLastKill: "2026-03-30T23:00:00Z", expectLastLoss: "2026-03-30T22:45:00Z", expectFreshness: "2026-03-30T23:00:00Z", expectProvenance: "mixed",
		},
		{
			name:        "TimestampWarn",
			charID:      900005,
			summary:     zkill.SummaryRow{CharacterID: 900005, RecentKills: 3, RecentKillsKnown: true, RecentLosses: 1, RecentLossesKnown: true, DangerRatio: 0.75, DangerRatioKnown: true, LastActivity: time.Date(2026, 3, 20, 12, 0, 0, 0, time.UTC)},
			details:     []zkill.Killmail{{KillID: 801, VictimID: 4001, Attackers: 1, ShipTypeID: 33818, TimestampClass: zkill.KillmailTimestampInvalid, OccurredAtInvalid: true}, {KillID: 802, VictimID: 900005, Attackers: 3, ShipTypeID: 33818, TimestampClass: zkill.KillmailTimestampMissing, OccurredAtInvalid: true, OccurredAtIssue: zkill.KillmailTimeIssueMissing}},
			expectKills: 1, expectLosses: 1, expectDanger: 50, expectSolo: 100, expectAvgGang: 1, expectMainShip: "ShipType #33818", expectLastKill: "", expectLastLoss: "", expectFreshness: "2026-03-20T12:00:00Z", expectProvenance: "summary",
		},
	}

	for _, p := range profiles {
		p := p
		t.Run(p.name, func(t *testing.T) {
			svc := app.NewAppServiceWithProviders(
				mockESIProvider{resolved: esi.ResolvedNames{Characters: map[string]int64{p.name: p.charID}}, idents: []domain.CharacterIdentity{{CharacterID: p.charID, Name: p.name}}},
				mockZKillProvider{summaries: map[int64]zkill.SummaryRow{p.charID: p.summary}, details: map[int64][]zkill.Killmail{p.charID: p.details}},
			)
			session, err := svc.AnalyzePastedText(p.name)
			if err != nil {
				t.Fatalf("AnalyzePastedText error: %v", err)
			}
			got := session.Pilots[0]

			if got.Kills != p.expectKills || got.Losses != p.expectLosses {
				t.Fatalf("kills/losses mismatch: got=%d/%d want=%d/%d", got.Kills, got.Losses, p.expectKills, p.expectLosses)
			}
			if got.DangerPct != p.expectDanger || got.SoloPct != p.expectSolo || got.AvgGangSize != p.expectAvgGang {
				t.Fatalf("metric mismatch: danger=%v solo=%v avgGang=%v", got.DangerPct, got.SoloPct, got.AvgGangSize)
			}
			if got.MainShip != p.expectMainShip {
				t.Fatalf("main ship mismatch: got=%q want=%q", got.MainShip, p.expectMainShip)
			}
			if got.LastKill != p.expectLastKill || got.LastLoss != p.expectLastLoss {
				t.Fatalf("recency mismatch: lastKill=%q lastLoss=%q", got.LastKill, got.LastLoss)
			}
			if got.Freshness.DataAsOf != p.expectFreshness || got.Provenance != p.expectProvenance {
				t.Fatalf("freshness/provenance mismatch: got=%s/%s want=%s/%s", got.Freshness.DataAsOf, got.Provenance, p.expectFreshness, p.expectProvenance)
			}
			if got.ThreatScore <= 0 && p.name != "LowActivity" {
				t.Fatalf("expected non-zero threat score for %s", p.name)
			}
		})
	}
}

func TestGoldenFixtureThreatBandDerivation(t *testing.T) {
	now := time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC)
	profiles := []struct {
		name       string
		charID     int64
		summary    zkill.SummaryRow
		details    []zkill.Killmail
		expectBand string
	}{
		{name: "Solo", charID: 900001, summary: zkill.SummaryRow{CharacterID: 900001, RecentKills: 4, RecentLosses: 1, DangerRatio: 0.8, DangerRatioKnown: true, RecentKillsKnown: true, RecentLossesKnown: true, LastActivity: now.Add(-24 * time.Hour)}, details: []zkill.Killmail{{KillID: 1, VictimID: 1, Attackers: 1, ShipTypeID: 17715, OccurredAt: now.Add(-1 * time.Hour), TimestampClass: zkill.KillmailTimestampValid}}, expectBand: "medium"},
		{name: "LowActivity", charID: 900003, summary: zkill.SummaryRow{CharacterID: 900003, RecentKills: 0, RecentLosses: 0, DangerRatio: 0, DangerRatioKnown: true, RecentKillsKnown: true, RecentLossesKnown: true, LastActivity: now.AddDate(-1, 0, 0)}, details: nil, expectBand: "minimal"},
		{name: "TimestampWarn", charID: 900005, summary: zkill.SummaryRow{CharacterID: 900005, RecentKills: 3, RecentLosses: 1, DangerRatio: 0.75, DangerRatioKnown: true, RecentKillsKnown: true, RecentLossesKnown: true, LastActivity: now.Add(-24 * time.Hour)}, details: []zkill.Killmail{{KillID: 1, VictimID: 3, Attackers: 1, ShipTypeID: 33818, TimestampClass: zkill.KillmailTimestampInvalid, OccurredAtInvalid: true}, {KillID: 2, VictimID: 900005, Attackers: 3, ShipTypeID: 33818, TimestampClass: zkill.KillmailTimestampMissing, OccurredAtInvalid: true}}, expectBand: "low"},
	}

	for _, p := range profiles {
		p := p
		t.Run(p.name, func(t *testing.T) {
			svc := app.NewAppServiceWithProviders(
				mockESIProvider{resolved: esi.ResolvedNames{Characters: map[string]int64{p.name: p.charID}}, idents: []domain.CharacterIdentity{{CharacterID: p.charID, Name: p.name}}},
				mockZKillProvider{summaries: map[int64]zkill.SummaryRow{p.charID: p.summary}, details: map[int64][]zkill.Killmail{p.charID: p.details}},
			)
			session, err := svc.AnalyzePastedText(p.name)
			if err != nil {
				t.Fatalf("AnalyzePastedText error: %v", err)
			}
			if session.Pilots[0].ThreatBand != p.expectBand {
				t.Fatalf("threat band mismatch: got=%q want=%q", session.Pilots[0].ThreatBand, p.expectBand)
			}
		})
	}
}
