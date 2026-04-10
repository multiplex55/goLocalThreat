package app

import (
	"time"

	"golocalthreat/internal/domain"
)

const dtoTimeLayout = time.RFC3339Nano

type AnalysisSessionDTO struct {
	SessionID              string                          `json:"sessionId"`
	CreatedAt              string                          `json:"createdAt"`
	UpdatedAt              string                          `json:"updatedAt"`
	Source                 ParseSourceDTO                  `json:"source"`
	Pilots                 []PilotThreatRecordDTO          `json:"pilots"`
	Settings               domain.Settings                 `json:"settings"`
	Warnings               []domain.ProviderWarning        `json:"warnings"`
	Freshness              FetchFreshnessDTO               `json:"freshness"`
	DurationMetrics        map[string]int64                `json:"durationMetrics,omitempty"`
	WarningCount           int                             `json:"warningCount,omitempty"`
	UnresolvedNames        []string                        `json:"unresolvedNames,omitempty"`
	ProviderWarningSummary []domain.ProviderWarningSummary `json:"providerWarningSummary,omitempty"`
}

type ParseSourceDTO struct {
	RawText             string                     `json:"rawText"`
	NormalizedText      string                     `json:"normalizedText"`
	ParsedCharacters    []domain.CharacterIdentity `json:"parsedCharacters"`
	CandidateNames      []string                   `json:"candidateNames"`
	InvalidLines        []domain.InvalidLine       `json:"invalidLines"`
	Warnings            []domain.ProviderWarning   `json:"warnings"`
	InputKind           string                     `json:"inputKind"`
	Confidence          float64                    `json:"confidence"`
	RemovedDuplicates   int                        `json:"removedDuplicates"`
	SuspiciousArtifacts int                        `json:"suspiciousArtifacts"`
	ParsedAt            string                     `json:"parsedAt"`
}

type PilotThreatRecordDTO struct {
	Identity    domain.CharacterIdentity `json:"identity"`
	Threat      domain.ThreatBreakdown   `json:"threat"`
	LastUpdated string                   `json:"lastUpdated"`
	Freshness   FetchFreshnessDTO        `json:"freshness"`
}

type FetchFreshnessDTO struct {
	Source   string `json:"source"`
	DataAsOf string `json:"dataAsOf"`
	IsStale  bool   `json:"isStale"`
}

func toAnalysisSessionDTO(in domain.AnalysisSession) AnalysisSessionDTO {
	pilots := make([]PilotThreatRecordDTO, 0, len(in.Pilots))
	for _, pilot := range in.Pilots {
		pilots = append(pilots, toPilotDTO(pilot))
	}
	return AnalysisSessionDTO{
		SessionID:              in.SessionID,
		CreatedAt:              toRFC3339(in.CreatedAt),
		UpdatedAt:              toRFC3339(in.UpdatedAt),
		Source:                 toParseSourceDTO(in.Source),
		Pilots:                 pilots,
		Settings:               in.Settings,
		Warnings:               in.Warnings,
		Freshness:              toFreshnessDTO(in.Freshness),
		DurationMetrics:        in.DurationMetrics,
		WarningCount:           in.WarningCount,
		UnresolvedNames:        in.UnresolvedNames,
		ProviderWarningSummary: in.ProviderWarningSummary,
	}
}

func toParseSourceDTO(in domain.ParseResult) ParseSourceDTO {
	return ParseSourceDTO{
		RawText:             in.RawText,
		NormalizedText:      in.NormalizedText,
		ParsedCharacters:    in.ParsedCharacters,
		CandidateNames:      in.CandidateNames,
		InvalidLines:        in.InvalidLines,
		Warnings:            in.Warnings,
		InputKind:           in.InputKind,
		Confidence:          in.Confidence,
		RemovedDuplicates:   in.RemovedDuplicates,
		SuspiciousArtifacts: in.SuspiciousArtifacts,
		ParsedAt:            toRFC3339(in.ParsedAt),
	}
}

func toPilotDTO(in domain.PilotThreatRecord) PilotThreatRecordDTO {
	return PilotThreatRecordDTO{
		Identity:    in.Identity,
		Threat:      in.Threat,
		LastUpdated: toRFC3339(in.LastUpdated),
		Freshness:   toFreshnessDTO(in.Freshness),
	}
}

func toFreshnessDTO(in domain.FetchFreshness) FetchFreshnessDTO {
	return FetchFreshnessDTO{
		Source:   in.Source,
		DataAsOf: toRFC3339(in.DataAsOf),
		IsStale:  in.IsStale,
	}
}

func toRFC3339(ts time.Time) string {
	if ts.IsZero() {
		return ""
	}
	return ts.UTC().Format(dtoTimeLayout)
}
