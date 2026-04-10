package esi

import (
	"context"

	"golocalthreat/internal/domain"
)

type NoopProvider struct{}

func (NoopProvider) ResolveNames(context.Context, []string) (ResolvedNames, error) {
	return ResolvedNames{Characters: map[string]int64{}}, nil
}

func (NoopProvider) GetCharacters(context.Context, []int64) ([]domain.CharacterIdentity, error) {
	return nil, nil
}

func (NoopProvider) GetCorporations(context.Context, []int64) (map[int64]string, error) {
	return map[int64]string{}, nil
}

func (NoopProvider) GetAlliances(context.Context, []int64) (map[int64]string, error) {
	return map[int64]string{}, nil
}
