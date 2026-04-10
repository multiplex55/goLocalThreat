package app

import (
	"sort"

	"golocalthreat/internal/domain"
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
