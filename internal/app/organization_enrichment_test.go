package app_test

import (
	"context"
	"testing"

	"golocalthreat/internal/app"
	"golocalthreat/internal/domain"
	"golocalthreat/internal/providers/esi"
)

type orgCountingProvider struct {
	mockESIProvider
	corpCalls     int
	allianceCalls int
}

func (m *orgCountingProvider) GetCorporations(context.Context, []int64) (map[int64]domain.OrganizationMetadata, error) {
	m.corpCalls++
	return map[int64]domain.OrganizationMetadata{
		10: {Name: "Shared Corp", Ticker: "SC"},
	}, nil
}

func (m *orgCountingProvider) GetAlliances(context.Context, []int64) (map[int64]domain.OrganizationMetadata, error) {
	m.allianceCalls++
	return map[int64]domain.OrganizationMetadata{
		20: {Name: "Shared Alliance", Ticker: "SA"},
	}, nil
}

func TestOrganizationMetadataIsCachedAcrossRefresh(t *testing.T) {
	provider := &orgCountingProvider{
		mockESIProvider: mockESIProvider{
			resolved: esi.ResolvedNames{Characters: map[string]int64{"Alpha": 1, "Beta": 2}},
			idents: []domain.CharacterIdentity{
				{CharacterID: 1, Name: "Alpha", CorpID: 10, AllianceID: 20},
				{CharacterID: 2, Name: "Beta", CorpID: 10, AllianceID: 20},
			},
		},
	}
	svc := app.NewAppServiceWithProviders(provider, mockZKillProvider{})
	session, err := svc.AnalyzePastedText("Alpha\nBeta")
	if err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}
	if provider.corpCalls != 1 || provider.allianceCalls != 1 {
		t.Fatalf("expected one metadata lookup each during first enrich path, corp=%d alliance=%d", provider.corpCalls, provider.allianceCalls)
	}
	if session.Pilots[0].Identity.CorpName == "" || session.Pilots[0].Identity.AllianceName == "" {
		t.Fatalf("expected enriched org names on pilot identity, got %#v", session.Pilots[0].Identity)
	}

	if _, err := svc.RefreshSession(session.SessionID); err != nil {
		t.Fatalf("RefreshSession err: %v", err)
	}
	if provider.corpCalls != 1 || provider.allianceCalls != 1 {
		t.Fatalf("expected metadata cache to avoid repeated lookups, corp=%d alliance=%d", provider.corpCalls, provider.allianceCalls)
	}
}
