package app

import (
	"context"
	"testing"

	"golocalthreat/internal/domain"
	"golocalthreat/internal/providers/esi"
	"golocalthreat/internal/providers/zkill"
)

type bootstrapESIProvider struct{}

func (bootstrapESIProvider) ResolveNames(context.Context, []string) (esi.ResolvedNames, error) {
	return esi.ResolvedNames{Characters: map[string]int64{}}, nil
}
func (bootstrapESIProvider) GetCharacters(context.Context, []int64) ([]domain.CharacterIdentity, error) {
	return nil, nil
}
func (bootstrapESIProvider) GetCorporations(context.Context, []int64) (map[int64]string, error) {
	return map[int64]string{}, nil
}
func (bootstrapESIProvider) GetAlliances(context.Context, []int64) (map[int64]string, error) {
	return map[int64]string{}, nil
}

type bootstrapZKillProvider struct{}

func (bootstrapZKillProvider) FetchSummary(context.Context, int64) (zkill.SummaryRow, error) {
	return zkill.SummaryRow{}, nil
}
func (bootstrapZKillProvider) FetchRecentByCharacter(context.Context, int64, int) ([]zkill.Killmail, error) {
	return nil, nil
}

func TestNewAppServiceWithProvidersUsesExplicitProviders(t *testing.T) {
	esiProvider := bootstrapESIProvider{}
	zkillProvider := bootstrapZKillProvider{}

	svc := NewAppServiceWithProviders(esiProvider, zkillProvider)

	if _, ok := svc.esi.(esi.NoopProvider); ok {
		t.Fatal("expected explicit ESI provider, got noop fallback")
	}
	if _, ok := svc.zkill.(noopZKillProvider); ok {
		t.Fatal("expected explicit zKill provider, got noop fallback")
	}
}

func TestNewAppServiceNoopProvidersAreDefaultOnlyForNoArgOrNilFallbackPaths(t *testing.T) {
	svc := NewAppService()
	if _, ok := svc.esi.(esi.NoopProvider); !ok {
		t.Fatalf("expected default constructor to use esi noop, got %T", svc.esi)
	}
	if _, ok := svc.zkill.(noopZKillProvider); !ok {
		t.Fatalf("expected default constructor to use zkill noop, got %T", svc.zkill)
	}

	nilSvc := NewAppServiceWithProviders(nil, nil)
	if _, ok := nilSvc.esi.(esi.NoopProvider); !ok {
		t.Fatalf("expected nil esi provider fallback to noop, got %T", nilSvc.esi)
	}
	if _, ok := nilSvc.zkill.(noopZKillProvider); !ok {
		t.Fatalf("expected nil zkill provider fallback to noop, got %T", nilSvc.zkill)
	}
}
