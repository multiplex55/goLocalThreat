package app

import (
	"fmt"
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
	Warnings    []domain.ProviderWarning `json:"warnings,omitempty"`
	Threat      domain.ThreatBreakdown   `json:"threat"`
	Pilot       string                   `json:"pilot"`
	Corp        string                   `json:"corp"`
	Alliance    string                   `json:"alliance"`
	ThreatScore float64                  `json:"threatScore"`
	ThreatBand  string                   `json:"threatBand"`
	Kills       int                      `json:"kills"`
	Losses      int                      `json:"losses"`
	DangerPct   float64                  `json:"dangerPercent"`
	SoloPct     float64                  `json:"soloPercent"`
	AvgGangSize float64                  `json:"avgGangSize"`
	LastKill    string                   `json:"lastKill"`
	LastLoss    string                   `json:"lastLoss"`
	MainShip    string                   `json:"mainShip"`
	Notes       string                   `json:"notes"`
	Tags        []string                 `json:"tags"`
	Provenance  string                   `json:"provenance"`
	LastUpdated string                   `json:"lastUpdated"`
	Freshness   FetchFreshnessDTO        `json:"freshness"`
}

type FetchFreshnessDTO struct {
	Source     string `json:"source"`
	DataAsOf   string `json:"dataAsOf"`
	IsStale    bool   `json:"isStale"`
	Provenance string `json:"provenance"`
}

func toAnalysisSessionDTO(in domain.AnalysisSession) AnalysisSessionDTO {
	warningsByPilotID := make(map[int64][]domain.ProviderWarning)
	for _, warning := range in.Warnings {
		if warning.CharacterID == nil {
			continue
		}
		id := *warning.CharacterID
		warningsByPilotID[id] = append(warningsByPilotID[id], warning)
	}

	pilots := make([]PilotThreatRecordDTO, 0, len(in.Pilots))
	for _, pilot := range in.Pilots {
		pilots = append(pilots, toPilotDTO(pilot, warningsByPilotID[pilot.Identity.CharacterID]))
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

func toPilotDTO(in domain.PilotThreatRecord, warnings []domain.ProviderWarning) PilotThreatRecordDTO {
	corp := in.Identity.CorpName
	if corp == "" && in.Identity.CorpID > 0 {
		corp = "Corp #" + fmt.Sprint(in.Identity.CorpID)
	}
	alliance := in.Identity.AllianceName
	if alliance == "" && in.Identity.AllianceID > 0 {
		alliance = "Alliance #" + fmt.Sprint(in.Identity.AllianceID)
	}
	return PilotThreatRecordDTO{
		Identity:    in.Identity,
		Warnings:    append([]domain.ProviderWarning(nil), warnings...),
		Threat:      in.Threat,
		Pilot:       in.Identity.Name,
		Corp:        corp,
		Alliance:    alliance,
		ThreatScore: in.Threat.ThreatScore,
		ThreatBand:  in.Threat.ThreatBand,
		Kills:       in.Threat.RecentKills,
		Losses:      in.Threat.RecentLosses,
		DangerPct:   in.Threat.DangerPercent,
		SoloPct:     in.Threat.SoloPercent,
		AvgGangSize: in.Threat.AvgGangSize,
		LastKill:    toRFC3339(in.Threat.LastKill),
		LastLoss:    toRFC3339(in.Threat.LastLoss),
		MainShip:    in.Threat.MainShip,
		Notes:       in.Threat.Notes,
		Tags:        append([]string(nil), in.Threat.ThreatReasons...),
		Provenance:  in.Freshness.Source,
		LastUpdated: toRFC3339(in.LastUpdated),
		Freshness:   toFreshnessDTO(in.Freshness),
	}
}

func toFreshnessDTO(in domain.FetchFreshness) FetchFreshnessDTO {
	return FetchFreshnessDTO{
		Source:     in.Source,
		DataAsOf:   toRFC3339(in.DataAsOf),
		IsStale:    in.IsStale,
		Provenance: in.Source,
	}
}

func toRFC3339(ts time.Time) string {
	if ts.IsZero() {
		return ""
	}
	return ts.UTC().Format(dtoTimeLayout)
}
