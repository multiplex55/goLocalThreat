package app

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"golocalthreat/internal/domain"
	"golocalthreat/internal/parser"
	"golocalthreat/internal/providers/esi"
)

type AppService struct {
	mu       sync.Mutex
	settings domain.Settings
	sessions map[string]domain.AnalysisSession
	esi      esi.Provider
}

func NewAppService() *AppService {
	return NewAppServiceWithProvider(esi.NoopProvider{})
}

func NewAppServiceWithProvider(provider esi.Provider) *AppService {
	if provider == nil {
		provider = esi.NoopProvider{}
	}
	return &AppService{
		settings: domain.Settings{RefreshInterval: 30},
		sessions: make(map[string]domain.AnalysisSession),
		esi:      provider,
	}
}

func (a *AppService) AnalyzePastedText(text string) (domain.AnalysisSession, error) {
	now := time.Now().UTC()
	parsed := parser.NewOrchestrator().Parse(text)
	parserWarnings := make([]domain.ProviderWarning, 0, len(parsed.Warnings))
	for _, warning := range parsed.Warnings {
		parserWarnings = append(parserWarnings, domain.ProviderWarning{Provider: "parser", Code: warning, Message: warning})
	}
	invalidLines := make([]domain.InvalidLine, 0, len(parsed.InvalidLines))
	for _, item := range parsed.InvalidLines {
		invalidLines = append(invalidLines, domain.InvalidLine{Line: item.Line, ReasonCode: item.ReasonCode})
	}
	identities, identityWarnings := a.resolveIdentities(parsed.Candidates)

	s := domain.AnalysisSession{
		SessionID: fmt.Sprintf("session-%d", now.UnixNano()),
		CreatedAt: now,
		UpdatedAt: now,
		Source: domain.ParseResult{
			RawText:             text,
			NormalizedText:      parsed.NormalizedText,
			ParsedCharacters:    identities,
			CandidateNames:      parsed.Candidates,
			InvalidLines:        invalidLines,
			Warnings:            parserWarnings,
			InputKind:           string(parsed.InputKind),
			Confidence:          parsed.Confidence,
			RemovedDuplicates:   parsed.RemovedDuplicates,
			SuspiciousArtifacts: parsed.SuspiciousArtifacts,
			ParsedAt:            now,
		},
		Pilots:   []domain.PilotThreatRecord{},
		Settings: a.settings,
		Warnings: identityWarnings,
		Freshness: domain.FetchFreshness{
			Source:   "esi",
			DataAsOf: now,
			IsStale:  false,
		},
	}
	if err := s.Validate(); err != nil {
		return domain.AnalysisSession{}, err
	}

	a.mu.Lock()
	a.sessions[s.SessionID] = s
	a.mu.Unlock()

	return s, nil
}

func (a *AppService) resolveIdentities(names []string) ([]domain.CharacterIdentity, []domain.ProviderWarning) {
	if len(names) == 0 {
		return nil, nil
	}
	resolved, err := a.esi.ResolveNames(context.Background(), names)
	warnings := make([]domain.ProviderWarning, 0)
	if err != nil {
		if errors.Is(err, domain.ErrRateLimited) {
			warnings = append(warnings, domain.ProviderWarning{Provider: "esi", Code: "RATE_LIMITED", Message: err.Error()})
			return nil, warnings
		}
		warnings = append(warnings, domain.ProviderWarning{Provider: "esi", Code: "RESOLVE_FAILED", Message: err.Error()})
		return nil, warnings
	}
	for _, unresolved := range resolved.Unresolved {
		warnings = append(warnings, domain.ProviderWarning{Provider: "esi", Code: "UNRESOLVED_NAME", Message: unresolved})
	}
	ids := make([]int64, 0, len(resolved.Characters))
	for _, id := range resolved.Characters {
		ids = append(ids, id)
	}
	identities, err := a.esi.GetCharacters(context.Background(), ids)
	if err != nil {
		warnings = append(warnings, domain.ProviderWarning{Provider: "esi", Code: "IDENTITY_PARTIAL", Message: err.Error()})
	}
	return identities, warnings
}

func (a *AppService) RefreshSession(sessionID string) (domain.AnalysisSession, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	s, ok := a.sessions[sessionID]
	if !ok {
		return domain.AnalysisSession{}, fmt.Errorf("session %s not found", sessionID)
	}
	s.UpdatedAt = time.Now().UTC()
	a.sessions[sessionID] = s
	return s, nil
}

func (a *AppService) RefreshPilot(sessionID string, characterID int64) (domain.PilotThreatRecord, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	s, ok := a.sessions[sessionID]
	if !ok {
		return domain.PilotThreatRecord{}, fmt.Errorf("session %s not found", sessionID)
	}
	for i := range s.Pilots {
		if s.Pilots[i].Identity.CharacterID == characterID {
			s.Pilots[i].LastUpdated = time.Now().UTC()
			a.sessions[sessionID] = s
			return s.Pilots[i], nil
		}
	}
	return domain.PilotThreatRecord{}, fmt.Errorf("pilot %d not found in session %s", characterID, sessionID)
}

func (a *AppService) LoadRecentSessions(limit int) ([]domain.AnalysisSession, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if limit <= 0 {
		limit = 10
	}
	out := make([]domain.AnalysisSession, 0, len(a.sessions))
	for _, s := range a.sessions {
		out = append(out, s)
		if len(out) == limit {
			break
		}
	}
	return out, nil
}

func (a *AppService) LoadSettings() (domain.Settings, error) {
	return a.settings, nil
}

func (a *AppService) SaveSettings(settings domain.Settings) (domain.Settings, error) {
	if err := settings.Validate(); err != nil {
		return domain.Settings{}, err
	}
	a.mu.Lock()
	a.settings = settings
	a.mu.Unlock()
	return a.settings, nil
}

func (a *AppService) PinPilot(characterID int64) (domain.Settings, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.settings.PinnedPilots = append(a.settings.PinnedPilots, characterID)
	return a.settings, nil
}

func (a *AppService) IgnoreCorp(corpID int64) (domain.Settings, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.settings.IgnoredCorps = append(a.settings.IgnoredCorps, corpID)
	return a.settings, nil
}

func (a *AppService) IgnoreAlliance(allianceID int64) (domain.Settings, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.settings.IgnoredAlliances = append(a.settings.IgnoredAlliances, allianceID)
	return a.settings, nil
}

func (a *AppService) ClearCache() (bool, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.sessions = make(map[string]domain.AnalysisSession)
	return true, nil
}
