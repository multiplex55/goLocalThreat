package app_test

import (
	"testing"
	"time"

	"golocalthreat/internal/app"
	"golocalthreat/internal/domain"
	"golocalthreat/internal/providers/esi"
	"golocalthreat/internal/providers/zkill"
)

func TestAnalyzePastedTextDetailTimestampQualityDoesNotInvalidateSession(t *testing.T) {
	lastActivity := time.Now().UTC().Add(-30 * time.Minute).Truncate(time.Second)
	esiProvider := mockESIProvider{
		resolved: esi.ResolvedNames{Characters: map[string]int64{"Alice": 101}},
		idents:   []domain.CharacterIdentity{{CharacterID: 101, Name: "Alice"}},
	}
	zkProvider := mockZKillProvider{
		summaries: map[int64]zkill.SummaryRow{
			101: {CharacterID: 101, RecentKills: 7, RecentLosses: 1, LastActivity: lastActivity},
		},
		details: map[int64][]zkill.Killmail{
			101: {{KillID: 1}, {KillID: 2}},
		},
	}

	svc := app.NewAppServiceWithProviders(esiProvider, zkProvider)
	session, err := svc.AnalyzePastedText("Alice")
	if err != nil {
		t.Fatalf("AnalyzePastedText should stay valid with degraded detail timestamps: %v", err)
	}
	if session.SessionID == "" {
		t.Fatalf("expected session id to be present")
	}
	if session.Freshness.DataAsOf == "" {
		t.Fatalf("session freshness should remain non-zero")
	}
}
