package zkill

import (
	"time"

	"golocalthreat/internal/domain"
	"golocalthreat/internal/scoring"
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
	engine := scoring.NewEngine(scoring.DefaultSettings)
	snapshot := time.Unix(0, 0).UTC()
	if !s.LastActivity.IsZero() {
		snapshot = s.LastActivity
	}
	input := scoring.EnrichedPilotInput{
		SnapshotAt:     snapshot,
		RecentKills:    scoring.OptionalFloat{Value: float64(s.RecentKills), Known: true},
		RecentLosses:   scoring.OptionalFloat{Value: float64(s.RecentLosses), Known: true},
		DangerRatio:    scoring.OptionalFloat{Value: s.DangerRatio, Known: true},
		LastActivityAt: scoring.OptionalTime{Value: s.LastActivity, Known: !s.LastActivity.IsZero()},
	}
	res := engine.Score(input)
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
	return domain.ThreatBreakdown{
		Total:         res.ThreatScore,
		ThreatScore:   res.ThreatScore,
		ThreatBand:    res.ThreatBand,
		ThreatReasons: res.ThreatReasons,
		Breakdown:     breakdown,
		Confidence:    res.Confidence,
		RecentKills:   s.RecentKills,
		RecentLosses:  s.RecentLosses,
		DangerPercent: s.DangerRatio * 100,
		Notes:         "summary derived",
	}
}

type KillmailTimeIssue string

const (
	KillmailTimeIssueNone    KillmailTimeIssue = ""
	KillmailTimeIssueMissing KillmailTimeIssue = "missing"
	KillmailTimeIssueInvalid KillmailTimeIssue = "invalid"
)

type Killmail struct {
	KillID            int64
	OccurredAt        time.Time
	OccurredAtInvalid bool
	OccurredAtIssue   KillmailTimeIssue
	VictimID          int64
	Attackers         int
	ShipTypeID        int64
	SystemID          int64
	DamageTaken       int64
}

type ProviderStatus struct {
	Freshness domain.FetchFreshness
	Warnings  []domain.ProviderWarning
}
