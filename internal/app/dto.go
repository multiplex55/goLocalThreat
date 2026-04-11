package app

import (
	"fmt"
	"sort"
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
	WarningDisplay         WarningDisplayDTO               `json:"warningDisplay"`
}

type WarningDisplayDTO struct {
	Global   WarningGlobalStatusDTO  `json:"global"`
	RowHints []WarningRowHintDTO     `json:"rowHints"`
	ByPilot  []WarningPilotDetailDTO `json:"byPilot"`
}

type WarningGlobalStatusDTO struct {
	Count int                   `json:"count"`
	Items []WarningAggregateDTO `json:"items"`
}

type WarningRowHintDTO struct {
	CharacterID int64 `json:"characterId"`
	Count       int   `json:"count"`
	HasImpact   bool  `json:"hasImpact"`
}

type WarningPilotDetailDTO struct {
	CharacterID int64                 `json:"characterId"`
	Items       []WarningAggregateDTO `json:"items"`
}

type WarningAggregateDTO struct {
	Code              string `json:"code"`
	Label             string `json:"label"`
	Count             int    `json:"count"`
	ImpactsRecency    bool   `json:"impactsRecency"`
	ImpactsTimestamps bool   `json:"impactsTimestamps"`
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
		WarningDisplay:         buildWarningDisplay(in.Warnings),
	}
}

func buildWarningDisplay(warnings []domain.ProviderWarning) WarningDisplayDTO {
	type aggregateAccumulator struct {
		item     WarningAggregateDTO
		pilotIDs map[int64]struct{}
	}

	aggregates := map[string]*aggregateAccumulator{}
	rowHintCounts := map[int64]int{}
	rowHintImpact := map[int64]bool{}
	pilotItems := map[int64]map[string]WarningAggregateDTO{}

	for _, warning := range warnings {
		label := warningMessageForCode(warning.Code, warning.Message)
		if label == "" {
			label = warning.Message
		}
		key := warning.Provider + ":" + warning.Code + ":" + label
		acc, ok := aggregates[key]
		if !ok {
			acc = &aggregateAccumulator{
				item: WarningAggregateDTO{
					Code:              warning.Code,
					Label:             label,
					Count:             0,
					ImpactsRecency:    warning.Code == "DETAIL_TIME_MISSING",
					ImpactsTimestamps: warning.Code == "DETAIL_TIME_INVALID" || warning.Code == "DETAIL_TIME_MISSING",
				},
				pilotIDs: map[int64]struct{}{},
			}
			aggregates[key] = acc
		}
		acc.item.Count++
		if warning.CharacterID != nil {
			id := *warning.CharacterID
			acc.pilotIDs[id] = struct{}{}
			if warning.Code == "DETAIL_TIME_INVALID" || warning.Code == "DETAIL_TIME_MISSING" {
				rowHintCounts[id]++
				rowHintImpact[id] = true
				if _, ok := pilotItems[id]; !ok {
					pilotItems[id] = map[string]WarningAggregateDTO{}
				}
				pi := pilotItems[id][key]
				pi.Code = warning.Code
				pi.Label = label
				pi.Count++
				pi.ImpactsRecency = pi.ImpactsRecency || warning.Code == "DETAIL_TIME_MISSING"
				pi.ImpactsTimestamps = true
				pilotItems[id][key] = pi
			}
		}
	}

	globalItems := make([]WarningAggregateDTO, 0, len(aggregates))
	for _, entry := range aggregates {
		globalItems = append(globalItems, entry.item)
	}
	sort.Slice(globalItems, func(i, j int) bool {
		if globalItems[i].Count != globalItems[j].Count {
			return globalItems[i].Count > globalItems[j].Count
		}
		return globalItems[i].Label < globalItems[j].Label
	})

	rowIDs := make([]int64, 0, len(rowHintCounts))
	for id := range rowHintCounts {
		rowIDs = append(rowIDs, id)
	}
	sort.Slice(rowIDs, func(i, j int) bool { return rowIDs[i] < rowIDs[j] })
	rowHints := make([]WarningRowHintDTO, 0, len(rowIDs))
	for _, id := range rowIDs {
		rowHints = append(rowHints, WarningRowHintDTO{CharacterID: id, Count: rowHintCounts[id], HasImpact: rowHintImpact[id]})
	}

	pilotIDs := make([]int64, 0, len(pilotItems))
	for id := range pilotItems {
		pilotIDs = append(pilotIDs, id)
	}
	sort.Slice(pilotIDs, func(i, j int) bool { return pilotIDs[i] < pilotIDs[j] })
	byPilot := make([]WarningPilotDetailDTO, 0, len(pilotIDs))
	for _, id := range pilotIDs {
		items := make([]WarningAggregateDTO, 0, len(pilotItems[id]))
		for _, item := range pilotItems[id] {
			items = append(items, item)
		}
		sort.Slice(items, func(i, j int) bool {
			if items[i].Count != items[j].Count {
				return items[i].Count > items[j].Count
			}
			return items[i].Label < items[j].Label
		})
		byPilot = append(byPilot, WarningPilotDetailDTO{CharacterID: id, Items: items})
	}

	return WarningDisplayDTO{
		Global:   WarningGlobalStatusDTO{Count: len(globalItems), Items: globalItems},
		RowHints: rowHints,
		ByPilot:  byPilot,
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
