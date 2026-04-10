package app

import (
	"fmt"
	"sync"
	"time"

	"golocalthreat/internal/domain"
)

type AppService struct {
	mu       sync.Mutex
	settings domain.Settings
	sessions map[string]domain.AnalysisSession
}

func NewAppService() *AppService {
	return &AppService{
		settings: domain.Settings{RefreshInterval: 30},
		sessions: make(map[string]domain.AnalysisSession),
	}
}

func (a *AppService) AnalyzePastedText(text string) (domain.AnalysisSession, error) {
	now := time.Now().UTC()
	s := domain.AnalysisSession{
		SessionID: fmt.Sprintf("session-%d", now.UnixNano()),
		CreatedAt: now,
		UpdatedAt: now,
		Source: domain.ParseResult{
			RawText:  text,
			ParsedAt: now,
		},
		Pilots:   []domain.PilotThreatRecord{},
		Settings: a.settings,
		Warnings: []domain.ProviderWarning{{Provider: "bootstrap", Code: "PLACEHOLDER", Message: "analysis pipeline not yet connected"}},
		Freshness: domain.FetchFreshness{
			Source:   "placeholder",
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
