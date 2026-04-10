package zkill

import (
	"time"

	"golocalthreat/internal/domain"
)

const providerName = "zkill"

type SummaryRow struct {
	CharacterID   int64
	RecentKills   int
	RecentLosses  int
	DangerRatio   float64
	LastActivity  time.Time
	HasDetailData bool
}

func (s SummaryRow) ToThreatBreakdown() domain.ThreatBreakdown {
	total := float64(s.RecentKills*2+s.RecentLosses) + s.DangerRatio
	return domain.ThreatBreakdown{
		Total:        total,
		RecentKills:  s.RecentKills,
		RecentLosses: s.RecentLosses,
	}
}

type Killmail struct {
	KillID      int64
	OccurredAt  time.Time
	VictimID    int64
	Attackers   int
	ShipTypeID  int64
	SystemID    int64
	DamageTaken int64
}

type ProviderStatus struct {
	Freshness domain.FetchFreshness
	Warnings  []domain.ProviderWarning
}
