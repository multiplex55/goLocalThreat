package esi

import (
	"context"

	"golocalthreat/internal/domain"
)

type Provider interface {
	ResolveNames(ctx context.Context, names []string) (ResolvedNames, error)
	GetCharacters(ctx context.Context, ids []int64) ([]domain.CharacterIdentity, error)
	GetCorporations(ctx context.Context, ids []int64) (map[int64]domain.OrganizationMetadata, error)
	GetAlliances(ctx context.Context, ids []int64) (map[int64]domain.OrganizationMetadata, error)
}

type ResolvedNames struct {
	Characters map[string]int64
	Unresolved []string
}
