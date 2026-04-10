package app

import (
	"reflect"
	"testing"

	"golocalthreat/internal/domain"
)

func TestSelectDetailFetchTargetsPolicy(t *testing.T) {
	pilots := []domain.PilotThreatRecord{
		{Identity: domain.CharacterIdentity{CharacterID: 1}, Threat: domain.ThreatBreakdown{Total: 10, RecentKills: 2, RecentLosses: 1}},
		{Identity: domain.CharacterIdentity{CharacterID: 2}, Threat: domain.ThreatBreakdown{Total: 9, RecentKills: 0, RecentLosses: 0}},
		{Identity: domain.CharacterIdentity{CharacterID: 3}, Threat: domain.ThreatBreakdown{Total: 8, RecentKills: 3, RecentLosses: 1}},
		{Identity: domain.CharacterIdentity{CharacterID: 4}, Threat: domain.ThreatBreakdown{Total: 1, RecentKills: 0, RecentLosses: 0}},
	}

	got := SelectDetailFetchTargets(pilots, 2, 3, false)
	want := []int64{1, 2, 3, 4}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("targets mismatch\nwant=%v\ngot=%v", want, got)
	}
}

func TestSelectDetailFetchTargetsExplicitRefresh(t *testing.T) {
	pilots := []domain.PilotThreatRecord{
		{Identity: domain.CharacterIdentity{CharacterID: 11}, Threat: domain.ThreatBreakdown{Total: 1}},
		{Identity: domain.CharacterIdentity{CharacterID: 12}, Threat: domain.ThreatBreakdown{Total: 2}},
	}
	got := SelectDetailFetchTargets(pilots, 1, 0, true)
	want := []int64{11, 12}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("explicit refresh should select all, got %v", got)
	}
}
