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
	if p.ParsedAt.IsZero() {
		return errors.New("parsedAt is required")
	}
	return nil
}

type CharacterIdentity struct {
	CharacterID    int64  `json:"characterId"`
	Name           string `json:"name"`
	CorpID         int64  `json:"corpId"`
	CorpName       string `json:"corpName,omitempty"`
	CorpTicker     string `json:"corpTicker,omitempty"`
	AllianceID     int64  `json:"allianceId"`
	AllianceName   string `json:"allianceName,omitempty"`
	AllianceTicker string `json:"allianceTicker,omitempty"`
}

type OrganizationMetadata struct {
	Name   string `json:"name"`
	Ticker string `json:"ticker,omitempty"`
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

type ThreatComponentBreakdown struct {
	Component    string  `json:"component"`
	Raw          float64 `json:"raw"`
	Weight       float64 `json:"weight"`
	Contribution float64 `json:"contribution"`
	Unknown      bool    `json:"unknown"`
	Explanation  string  `json:"explanation"`
}

type ThreatBreakdown struct {
	Total          float64                    `json:"total"`
	ThreatScore    float64                    `json:"threatScore"`
	ThreatBand     string                     `json:"threatBand"`
	ThreatReasons  []string                   `json:"threatReasons"`
	Breakdown      []ThreatComponentBreakdown `json:"threatBreakdown"`
	Confidence     float64                    `json:"confidence"`
	RecentKills    int                        `json:"recentKills"`
	RecentLosses   int                        `json:"recentLosses"`
	DangerPercent  float64                    `json:"dangerPercent"`
	SoloPercent    float64                    `json:"soloPercent"`
	AvgGangSize    float64                    `json:"avgGangSize"`
	LastKill       time.Time                  `json:"lastKill,omitempty"`
	LastLoss       time.Time                  `json:"lastLoss,omitempty"`
	MainShip       string                     `json:"mainShip,omitempty"`
	Notes          string                     `json:"notes,omitempty"`
	SecurityStatus float64                    `json:"securityStatus"`
}

func (t ThreatBreakdown) Validate() error {
	if t.ThreatScore < 0 || t.Total < 0 {
		return errors.New("threat scores cannot be negative")
	}
	return nil
}

type ProviderWarningSummary struct {
	Provider string `json:"provider"`
	Count    int    `json:"count"`
}

type AnalysisSession struct {
	SessionID              string                   `json:"sessionId"`
	CreatedAt              time.Time                `json:"createdAt"`
	UpdatedAt              time.Time                `json:"updatedAt"`
	Source                 ParseResult              `json:"source"`
	Pilots                 []PilotThreatRecord      `json:"pilots"`
	Settings               Settings                 `json:"settings"`
	Warnings               []ProviderWarning        `json:"warnings"`
	Freshness              FetchFreshness           `json:"freshness"`
	DurationMetrics        map[string]int64         `json:"durationMetrics,omitempty"`
	WarningCount           int                      `json:"warningCount,omitempty"`
	UnresolvedNames        []string                 `json:"unresolvedNames,omitempty"`
	ProviderWarningSummary []ProviderWarningSummary `json:"providerWarningSummary,omitempty"`
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

type ScoringWeights struct {
	Activity    float64 `json:"activity"`
	Lethality   float64 `json:"lethality"`
	SoloRisk    float64 `json:"soloRisk"`
	Recentness  float64 `json:"recentness"`
	Context     float64 `json:"context"`
	Uncertainty float64 `json:"uncertainty"`
}

type ScoringThresholds struct {
	Low      float64 `json:"low"`
	Medium   float64 `json:"medium"`
	High     float64 `json:"high"`
	Critical float64 `json:"critical"`
}

type ScoringSettings struct {
	Weights    ScoringWeights    `json:"weights"`
	Thresholds ScoringThresholds `json:"thresholds"`
}

type Settings struct {
	IgnoredCorps     []int64         `json:"ignoredCorps"`
	IgnoredAlliances []int64         `json:"ignoredAlliances"`
	PinnedPilots     []int64         `json:"pinnedPilots"`
	RefreshInterval  int             `json:"refreshInterval"`
	Scoring          ScoringSettings `json:"scoring"`
}

func (s Settings) Validate() error {
	if s.RefreshInterval < 0 {
		return errors.New("refreshInterval cannot be negative")
	}
	w := s.Scoring.Weights
	if w.Activity < 0 || w.Lethality < 0 || w.SoloRisk < 0 || w.Recentness < 0 || w.Context < 0 || w.Uncertainty < 0 {
		return errors.New("scoring weights cannot be negative")
	}
	if w.Activity+w.Lethality+w.SoloRisk+w.Recentness+w.Context+w.Uncertainty <= 0 {
		return errors.New("at least one scoring weight must be positive")
	}
	t := s.Scoring.Thresholds
	if !(t.Low <= t.Medium && t.Medium <= t.High && t.High <= t.Critical) {
		return errors.New("scoring thresholds must be ordered low <= medium <= high <= critical")
	}
	return nil
}

type ProviderWarning struct {
	Provider      string            `json:"provider"`
	Code          string            `json:"code"`
	Message       string            `json:"message"`
	CharacterID   *int64            `json:"characterId,omitempty"`
	CharacterName string            `json:"characterName,omitempty"`
	Severity      string            `json:"severity"`
	UserVisible   bool              `json:"userVisible"`
	Category      string            `json:"category"`
	Metadata      map[string]string `json:"metadata,omitempty"`
}

func (p ProviderWarning) Validate() error {
	if p.Provider == "" {
		return errors.New("provider is required")
	}
	if p.Message == "" {
		return errors.New("message is required")
	}
	if p.Severity == "" {
		return errors.New("severity is required")
	}
	if p.Category == "" {
		return errors.New("category is required")
	}
	if p.CharacterName != "" && p.CharacterID == nil {
		return errors.New("characterId is required when characterName is provided")
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
