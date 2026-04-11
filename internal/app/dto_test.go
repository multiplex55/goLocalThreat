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

func TestToPilotDTOExportsThreatScoreAndBandForLowConfidenceCases(t *testing.T) {
	dto := toPilotDTO(domain.PilotThreatRecord{
		Identity: domain.CharacterIdentity{CharacterID: 99, Name: "Risky Pilot"},
		Threat: domain.ThreatBreakdown{
			ThreatScore:    37.5,
			ThreatBand:     "medium",
			Confidence:     0.4,
			RecentKills:    6,
			RecentLosses:   2,
			ThreatReasons:  []string{"recentness unknown", "activity 20"},
			DangerPercent:  85,
			SoloPercent:    50,
			AvgGangSize:    1.8,
			Notes:          "summary + detail killmails: 2; partial timestamps: 1/2 killmails",
		},
		LastUpdated: time.Now().UTC(),
		Freshness:   domain.FetchFreshness{Source: "zkill", DataAsOf: time.Now().UTC()},
	}, nil)

	if dto.ThreatScore <= 0 || dto.ThreatBand == "" {
		t.Fatalf("expected threat score/band in DTO, got score=%.2f band=%q", dto.ThreatScore, dto.ThreatBand)
	}
	if dto.Kills != 6 || dto.Losses != 2 {
		t.Fatalf("expected summary stats in DTO, got kills=%d losses=%d", dto.Kills, dto.Losses)
	}
}
