package app

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"golocalthreat/internal/domain"
	"golocalthreat/internal/providers/zkill"
	"golocalthreat/internal/scoring"
)

func SelectDetailFetchTargets(pilots []domain.PilotThreatRecord, topN int, selectedPilotID int64, explicitRefresh bool) []int64 {
	if len(pilots) == 0 {
		return nil
	}
	selected := map[int64]struct{}{}
	if explicitRefresh {
		for _, p := range pilots {
			selected[p.Identity.CharacterID] = struct{}{}
		}
		return orderedKeys(selected)
	}

	sorted := append([]domain.PilotThreatRecord(nil), pilots...)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Threat.Total > sorted[j].Threat.Total
	})
	if topN <= 0 {
		topN = 3
	}
	if topN > len(sorted) {
		topN = len(sorted)
	}
	for i := 0; i < topN; i++ {
		selected[sorted[i].Identity.CharacterID] = struct{}{}
	}
	if selectedPilotID > 0 {
		selected[selectedPilotID] = struct{}{}
	}
	for _, p := range pilots {
		if p.Threat.RecentKills+p.Threat.RecentLosses == 0 {
			selected[p.Identity.CharacterID] = struct{}{}
		}
	}
	return orderedKeys(selected)
}

func orderedKeys(in map[int64]struct{}) []int64 {
	out := make([]int64, 0, len(in))
	for id := range in {
		out = append(out, id)
	}
	sort.Slice(out, func(i, j int) bool { return out[i] < out[j] })
	return out
}

type detailThreatEvidence struct {
	Killmails           int
	Kills               int
	Losses              int
	LastKill            time.Time
	LastLoss            time.Time
	LastActivity        time.Time
	MainShip            string
	SoloPercent         float64
	AvgGangSize         float64
	HasCombatVolume     bool
	HasRecency          bool
	HasShipEvidence     bool
	InvalidOccurredAt   int
	MissingOccurredAt   int
	ValidOccurredAt     int
	SummaryFriendlyNote string
}

func deriveDetailThreatEvidence(characterID int64, kms []zkill.Killmail) detailThreatEvidence {
	out := detailThreatEvidence{}
	if len(kms) == 0 {
		return out
	}
	out.Killmails = len(kms)
	shipCounts := map[int64]int{}
	soloKills := 0
	totalAttackers := 0
	for _, km := range kms {
		if km.OccurredAtInvalid {
			out.InvalidOccurredAt++
			if km.OccurredAtIssue == zkill.KillmailTimeIssueMissing {
				out.MissingOccurredAt++
			}
		}
		if km.VictimID == characterID {
			out.Losses++
			if !km.OccurredAt.IsZero() {
				occurredAt := km.OccurredAt.UTC()
				if out.LastLoss.IsZero() || occurredAt.After(out.LastLoss) {
					out.LastLoss = occurredAt
				}
			}
		} else {
			out.Kills++
			if !km.OccurredAt.IsZero() {
				occurredAt := km.OccurredAt.UTC()
				if out.LastKill.IsZero() || occurredAt.After(out.LastKill) {
					out.LastKill = occurredAt
				}
			}
			if km.Attackers == 1 {
				soloKills++
			}
			totalAttackers += max(1, km.Attackers)
		}
		if !km.OccurredAt.IsZero() {
			out.ValidOccurredAt++
			occurredAt := km.OccurredAt.UTC()
			if out.LastActivity.IsZero() || occurredAt.After(out.LastActivity) {
				out.LastActivity = occurredAt
			}
		}
		if km.ShipTypeID > 0 {
			shipCounts[km.ShipTypeID]++
		}
	}
	if out.Kills > 0 {
		out.SoloPercent = (float64(soloKills) / float64(out.Kills)) * 100
		out.AvgGangSize = float64(totalAttackers) / float64(out.Kills)
	}
	bestShipID := int64(0)
	bestCount := 0
	for shipID, count := range shipCounts {
		if count > bestCount {
			bestCount = count
			bestShipID = shipID
		}
	}
	if bestShipID > 0 {
		out.MainShip = fmt.Sprintf("ShipType #%d", bestShipID)
		out.HasShipEvidence = true
	}
	out.HasCombatVolume = out.Kills+out.Losses > 0
	out.HasRecency = out.ValidOccurredAt > 0
	notes := []string{fmt.Sprintf("summary + detail killmails: %d", len(kms))}
	if out.InvalidOccurredAt > 0 {
		notes = append(notes, fmt.Sprintf("partial timestamps: %d/%d killmails", out.InvalidOccurredAt, len(kms)))
	}
	out.SummaryFriendlyNote = strings.Join(notes, "; ")
	return out
}

func mergePilotThreat(summary zkill.SummaryRow, detail detailThreatEvidence, refreshIntervalMin int, now time.Time) (domain.ThreatBreakdown, domain.FetchFreshness, string) {
	kills := summary.RecentKills
	losses := summary.RecentLosses
	dangerPct := summary.DangerRatio * 100
	soloPct := 0.0
	avgGang := 0.0
	lastKill := time.Time{}
	lastLoss := time.Time{}
	lastActivity := summary.LastActivity.UTC()
	mainShip := ""
	notes := "summary derived"
	provenance := "summary"

	if detail.HasCombatVolume {
		kills = detail.Kills
		losses = detail.Losses
		if kills+losses > 0 {
			dangerPct = (float64(kills) / float64(kills+losses)) * 100
		}
		soloPct = detail.SoloPercent
		avgGang = detail.AvgGangSize
		notes = detail.SummaryFriendlyNote
		if provenance == "summary" {
			provenance = "mixed"
		}
	}
	if detail.LastKill.After(lastKill) {
		lastKill = detail.LastKill
	}
	if detail.LastLoss.After(lastLoss) {
		lastLoss = detail.LastLoss
	}
	if detail.HasRecency {
		lastActivity = detail.LastActivity
		if provenance == "summary" {
			provenance = "detail"
		}
	}
	if detail.HasShipEvidence {
		mainShip = detail.MainShip
		if provenance == "summary" {
			provenance = "detail"
		}
	}
	if detail.Killmails > 0 && !detail.HasRecency {
		if provenance == "summary" {
			provenance = "partial"
		} else {
			provenance = "mixed"
		}
	}
	if detail.Killmails > 0 && notes == "" {
		notes = detail.SummaryFriendlyNote
	}

	engine := scoring.NewEngine(scoring.DefaultSettings)
	snapshot := now
	if !lastActivity.IsZero() {
		snapshot = lastActivity
	}
	res := engine.Score(scoring.EnrichedPilotInput{
		SnapshotAt:     snapshot,
		RecentKills:    scoring.OptionalFloat{Value: float64(kills), Known: true},
		RecentLosses:   scoring.OptionalFloat{Value: float64(losses), Known: true},
		DangerRatio:    scoring.OptionalFloat{Value: dangerPct / 100, Known: true},
		LastActivityAt: scoring.OptionalTime{Value: lastActivity, Known: !lastActivity.IsZero()},
	})
	breakdown := make([]domain.ThreatComponentBreakdown, 0, len(res.Breakdown))
	for _, b := range res.Breakdown {
		breakdown = append(breakdown, domain.ThreatComponentBreakdown{
			Component:    b.Component,
			Raw:          b.Raw,
			Weight:       b.Weight,
			Contribution: b.Contribution,
			Unknown:      b.Unknown,
			Explanation:  b.Explanation,
		})
	}

	merged := domain.ThreatBreakdown{
		Total:         res.ThreatScore,
		ThreatScore:   res.ThreatScore,
		ThreatBand:    res.ThreatBand,
		ThreatReasons: res.ThreatReasons,
		Breakdown:     breakdown,
		Confidence:    res.Confidence,
		RecentKills:   kills,
		RecentLosses:  losses,
		DangerPercent: dangerPct,
		SoloPercent:   soloPct,
		AvgGangSize:   avgGang,
		LastKill:      lastKill,
		LastLoss:      lastLoss,
		MainShip:      mainShip,
		Notes:         notes,
	}

	dataAsOf := now
	if !lastActivity.IsZero() {
		dataAsOf = lastActivity
	}
	return merged, domain.FetchFreshness{
		Source:   provenance,
		DataAsOf: dataAsOf,
		IsStale:  isStale(dataAsOf, refreshIntervalMin),
	}, provenance
}
