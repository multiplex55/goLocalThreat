package app

import (
	"testing"

	"golocalthreat/internal/domain"
)

func TestWarningEnrichmentIncludesMetadata(t *testing.T) {
	warning := newWarning("zkill", "SUMMARY_FAILED", "summary failed", "timeout", nil)

	if warning.Severity != "error" {
		t.Fatalf("expected error severity, got %q", warning.Severity)
	}
	if warning.Category != "transport" {
		t.Fatalf("expected transport category, got %q", warning.Category)
	}
	if !warning.UserVisible {
		t.Fatalf("expected userVisible true")
	}
}

func TestPilotScopedWarningIncludesCharacterIdentifier(t *testing.T) {
	ident := domain.CharacterIdentity{CharacterID: 9001, Name: "Pilot Nine"}
	warning := newWarning("zkill", "DETAIL_FAILED", "detail unavailable", "upstream timeout", &ident)

	if warning.CharacterID == nil || *warning.CharacterID != ident.CharacterID {
		t.Fatalf("expected pilot characterId to be set, got %#v", warning.CharacterID)
	}
	if warning.CharacterName != ident.Name {
		t.Fatalf("expected characterName %q, got %q", ident.Name, warning.CharacterName)
	}
}

func TestWarningCodeMapsToUserFacingMessage(t *testing.T) {
	if got := warningMessageForCode("DETAIL_TIME_INVALID", "fallback"); got != "Partial zKill timestamps" {
		t.Fatalf("unexpected mapped message for DETAIL_TIME_INVALID: %q", got)
	}
	if got := warningMessageForCode("DETAIL_TIME_MISSING", "fallback"); got != "Recent activity has partial timestamps" {
		t.Fatalf("unexpected mapped message for DETAIL_TIME_MISSING: %q", got)
	}
}

func TestAggregateTimestampWarningsAddsCountsAndImpactFlags(t *testing.T) {
	charID := int64(9001)
	aggregated := aggregateTimestampWarnings([]domain.ProviderWarning{
		{Provider: "zkill", Code: "DETAIL_TIME_INVALID", CharacterID: &charID},
		{Provider: "zkill", Code: "DETAIL_TIME_MISSING", CharacterID: &charID},
	})

	if len(aggregated) != 2 {
		t.Fatalf("expected two warnings, got %d", len(aggregated))
	}
	if aggregated[0].Metadata["aggregateGlobalCount"] != "2" {
		t.Fatalf("expected aggregateGlobalCount metadata, got %#v", aggregated[0].Metadata)
	}
	if aggregated[0].Metadata["impact.timestamps"] != "true" {
		t.Fatalf("expected impact.timestamps=true, got %#v", aggregated[0].Metadata)
	}
	if aggregated[1].Metadata["impact.recency"] != "true" {
		t.Fatalf("expected recency impact on DETAIL_TIME_MISSING, got %#v", aggregated[1].Metadata)
	}
}
