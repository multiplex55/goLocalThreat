package store

import (
	"context"
	"testing"
	"time"

	"golocalthreat/internal/domain"
)

func newTestStore(t *testing.T, retention RetentionPolicy) *Store {
	t.Helper()
	s, err := OpenSQLiteInMemory(retention)
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	t.Cleanup(func() { _ = s.Close() })
	return s
}

func validSettings() domain.Settings {
	return domain.Settings{
		RefreshInterval: 30,
		Scoring: domain.ScoringSettings{
			Weights:    domain.ScoringWeights{Activity: 1, Lethality: 1, SoloRisk: 1, Recentness: 1, Context: 1, Uncertainty: 1},
			Thresholds: domain.ScoringThresholds{Low: 10, Medium: 30, High: 60, Critical: 90},
		},
	}
}

func validSession(id string, now time.Time) domain.AnalysisSession {
	settings := validSettings()
	return domain.AnalysisSession{
		SessionID: id,
		CreatedAt: now,
		UpdatedAt: now,
		Source: domain.ParseResult{
			RawText:             "Alice\nBob",
			NormalizedText:      "alice\nbob",
			ParsedCharacters:    []domain.CharacterIdentity{{CharacterID: 11, Name: "Alice"}},
			CandidateNames:      []string{"Alice", "Bob"},
			InvalidLines:        []domain.InvalidLine{{Line: "###", ReasonCode: "noise"}},
			Warnings:            []domain.ProviderWarning{{Provider: "parser", Code: "noise", Message: "noise"}},
			InputKind:           "local",
			Confidence:          0.97,
			RemovedDuplicates:   1,
			SuspiciousArtifacts: 0,
			ParsedAt:            now,
		},
		Pilots: []domain.PilotThreatRecord{{
			Identity:    domain.CharacterIdentity{CharacterID: 11, Name: "Alice"},
			Threat:      domain.ThreatBreakdown{ThreatScore: 20, Total: 20},
			LastUpdated: now,
			Freshness:   domain.FetchFreshness{Source: "zkill", DataAsOf: now},
		}},
		Settings:        settings,
		Warnings:        []domain.ProviderWarning{{Provider: "esi", Code: "warn", Message: "test"}},
		Freshness:       domain.FetchFreshness{Source: "composite", DataAsOf: now},
		DurationMetrics: map[string]int64{"parse_ms": 3, "total_ms": 10},
		WarningCount:    1,
		UnresolvedNames: []string{"Bob"},
	}
}

func bg() context.Context { return context.Background() }
