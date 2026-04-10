package app_test

import (
	"context"
	"strings"
	"testing"

	"golocalthreat/internal/app"
	"golocalthreat/internal/domain"
	"golocalthreat/internal/providers/esi"
)

type stubProvider struct{}

func (stubProvider) ResolveNames(context.Context, []string) (esi.ResolvedNames, error) {
	return esi.ResolvedNames{
		Characters: map[string]int64{"Alice": 1001},
		Unresolved: []string{"Unknown Name"},
	}, nil
}

func (stubProvider) GetCharacters(context.Context, []int64) ([]domain.CharacterIdentity, error) {
	return []domain.CharacterIdentity{{CharacterID: 1001, Name: "Alice", CorpID: 555, AllianceID: 777}}, nil
}

func (stubProvider) GetCorporations(context.Context, []int64) (map[int64]string, error) {
	return map[int64]string{}, nil
}

func (stubProvider) GetAlliances(context.Context, []int64) (map[int64]string, error) {
	return map[int64]string{}, nil
}

func TestAnalyzePastedText_UnresolvedNamesBecomeWarnings(t *testing.T) {
	svc := app.NewAppServiceWithProvider(stubProvider{})
	session, err := svc.AnalyzePastedText("Alice\nUnknown Name")
	if err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}
	if len(session.Source.ParsedCharacters) != 1 {
		t.Fatalf("expected one resolved character, got %#v", session.Source.ParsedCharacters)
	}
	found := false
	for _, warning := range session.Warnings {
		if warning.Provider == "esi" && warning.Code == "UNRESOLVED_NAME" && strings.Contains(warning.Message, "Unknown Name") {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected unresolved warning, got %#v", session.Warnings)
	}
}
