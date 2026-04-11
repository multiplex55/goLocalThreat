package app

import (
	"testing"
	"time"

	"golocalthreat/internal/domain"
)

func TestToPilotDTOIncludesOrganizationDisplayFields(t *testing.T) {
	dto := toPilotDTO(domain.PilotThreatRecord{
		Identity: domain.CharacterIdentity{
			CharacterID:    7,
			Name:           "Pilot Seven",
			CorpID:         100,
			CorpName:       "Acme Corp",
			CorpTicker:     "ACME",
			AllianceID:     200,
			AllianceName:   "Blue Alliance",
			AllianceTicker: "BLUE",
		},
		LastUpdated: time.Now().UTC(),
		Freshness:   domain.FetchFreshness{Source: "zkill", DataAsOf: time.Now().UTC()},
	}, nil)

	if dto.Identity.CorpName != "Acme Corp" || dto.Identity.CorpTicker != "ACME" {
		t.Fatalf("corporation metadata was not mapped: %#v", dto.Identity)
	}
	if dto.Identity.AllianceName != "Blue Alliance" || dto.Identity.AllianceTicker != "BLUE" {
		t.Fatalf("alliance metadata was not mapped: %#v", dto.Identity)
	}
}

func TestToAnalysisSessionDTOAttachesPilotScopedWarnings(t *testing.T) {
	now := time.Now().UTC()
	charID := int64(77)
	dto := toAnalysisSessionDTO(domain.AnalysisSession{
		SessionID: "session-1",
		CreatedAt: now,
		UpdatedAt: now,
		Source: domain.ParseResult{
			RawText:  "Pilot",
			ParsedAt: now,
		},
		Pilots: []domain.PilotThreatRecord{{Identity: domain.CharacterIdentity{CharacterID: charID, Name: "Pilot"}}},
		Settings: domain.Settings{
			RefreshInterval: 30,
			Scoring: domain.ScoringSettings{
				Weights:    domain.ScoringWeights{Activity: 1, Lethality: 1, SoloRisk: 1, Recentness: 1, Context: 1, Uncertainty: 1},
				Thresholds: domain.ScoringThresholds{Low: 1, Medium: 2, High: 3, Critical: 4},
			},
		},
		Warnings: []domain.ProviderWarning{
			{Provider: "zkill", Code: "DETAIL_TIME_INVALID", Message: "Partial zKill timestamps", CharacterID: &charID, CharacterName: "Pilot", Severity: "info", UserVisible: false, Category: "data_quality"},
			{Provider: "zkill", Code: "SUMMARY_FAILED", Message: "Summary load failed", Severity: "error", UserVisible: true, Category: "transport"},
		},
		Freshness: domain.FetchFreshness{Source: "composite", DataAsOf: now},
	})

	if len(dto.Pilots) != 1 || len(dto.Pilots[0].Warnings) != 1 {
		t.Fatalf("expected one pilot warning attached, got %#v", dto.Pilots)
	}
	if dto.Pilots[0].Warnings[0].CharacterID == nil || *dto.Pilots[0].Warnings[0].CharacterID != charID {
		t.Fatalf("expected pilot warning characterId %d, got %#v", charID, dto.Pilots[0].Warnings[0].CharacterID)
	}
}
