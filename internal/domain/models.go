package domain

import (
	"errors"
	"fmt"
	"time"
)

type ParseResult struct {
	RawText             string              `json:"rawText"`
	NormalizedText      string              `json:"normalizedText"`
	ParsedCharacters    []CharacterIdentity `json:"parsedCharacters"`
	CandidateNames      []string            `json:"candidateNames"`
	InvalidLines        []InvalidLine       `json:"invalidLines"`
	Warnings            []ProviderWarning   `json:"warnings"`
	InputKind           string              `json:"inputKind"`
	Confidence          float64             `json:"confidence"`
	RemovedDuplicates   int                 `json:"removedDuplicates"`
	SuspiciousArtifacts int                 `json:"suspiciousArtifacts"`
	ParsedAt            time.Time           `json:"parsedAt"`
}

type InvalidLine struct {
	Line       string `json:"line"`
	ReasonCode string `json:"reasonCode"`
}

func (p ParseResult) Validate() error {
	if p.RawText == "" {
		return errors.New("rawText is required")
	}
	if p.ParsedAt.IsZero() {
		return errors.New("parsedAt is required")
	}
	return nil
}

type CharacterIdentity struct {
	CharacterID int64  `json:"characterId"`
	Name        string `json:"name"`
	CorpID      int64  `json:"corpId"`
	AllianceID  int64  `json:"allianceId"`
}

func (c CharacterIdentity) Validate() error {
	if c.CharacterID <= 0 {
		return errors.New("characterId must be positive")
	}
	if c.Name == "" {
		return errors.New("name is required")
	}
	return nil
}

type PilotThreatRecord struct {
	Identity    CharacterIdentity `json:"identity"`
	Threat      ThreatBreakdown   `json:"threat"`
	LastUpdated time.Time         `json:"lastUpdated"`
	Freshness   FetchFreshness    `json:"freshness"`
}

func (p PilotThreatRecord) Validate() error {
	if err := p.Identity.Validate(); err != nil {
		return fmt.Errorf("identity: %w", err)
	}
	if p.LastUpdated.IsZero() {
		return errors.New("lastUpdated is required")
	}
	if err := p.Freshness.Validate(); err != nil {
		return fmt.Errorf("freshness: %w", err)
	}
	return nil
}

type ThreatBreakdown struct {
	Total          float64 `json:"total"`
	RecentKills    int     `json:"recentKills"`
	RecentLosses   int     `json:"recentLosses"`
	SecurityStatus float64 `json:"securityStatus"`
}

func (t ThreatBreakdown) Validate() error {
	if t.Total < 0 {
		return errors.New("total cannot be negative")
	}
	return nil
}

type AnalysisSession struct {
	SessionID string              `json:"sessionId"`
	CreatedAt time.Time           `json:"createdAt"`
	UpdatedAt time.Time           `json:"updatedAt"`
	Source    ParseResult         `json:"source"`
	Pilots    []PilotThreatRecord `json:"pilots"`
	Settings  Settings            `json:"settings"`
	Warnings  []ProviderWarning   `json:"warnings"`
	Freshness FetchFreshness      `json:"freshness"`
}

func (a AnalysisSession) Validate() error {
	if a.SessionID == "" {
		return errors.New("sessionId is required")
	}
	if a.CreatedAt.IsZero() || a.UpdatedAt.IsZero() {
		return errors.New("createdAt and updatedAt are required")
	}
	if err := a.Source.Validate(); err != nil {
		return fmt.Errorf("source: %w", err)
	}
	if err := a.Settings.Validate(); err != nil {
		return fmt.Errorf("settings: %w", err)
	}
	if err := a.Freshness.Validate(); err != nil {
		return fmt.Errorf("freshness: %w", err)
	}
	return nil
}

type Settings struct {
	IgnoredCorps     []int64 `json:"ignoredCorps"`
	IgnoredAlliances []int64 `json:"ignoredAlliances"`
	PinnedPilots     []int64 `json:"pinnedPilots"`
	RefreshInterval  int     `json:"refreshInterval"`
}

func (s Settings) Validate() error {
	if s.RefreshInterval < 0 {
		return errors.New("refreshInterval cannot be negative")
	}
	return nil
}

type ProviderWarning struct {
	Provider string `json:"provider"`
	Code     string `json:"code"`
	Message  string `json:"message"`
}

func (p ProviderWarning) Validate() error {
	if p.Provider == "" {
		return errors.New("provider is required")
	}
	if p.Message == "" {
		return errors.New("message is required")
	}
	return nil
}

type FetchFreshness struct {
	Source   string    `json:"source"`
	DataAsOf time.Time `json:"dataAsOf"`
	IsStale  bool      `json:"isStale"`
}

func (f FetchFreshness) Validate() error {
	if f.Source == "" {
		return errors.New("source is required")
	}
	if f.DataAsOf.IsZero() {
		return errors.New("dataAsOf is required")
	}
	return nil
}
