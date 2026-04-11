package zkill

import (
	"time"

	"golocalthreat/internal/domain"
	"golocalthreat/internal/scoring"
)

const providerName = "zkill"

type SummaryRow struct {
	CharacterID       int64
	RecentKills       int
	RecentKillsKnown  bool
	RecentLosses      int
	RecentLossesKnown bool
	DangerRatio       float64
	DangerRatioKnown  bool
	LastActivity      time.Time
	HasDetailData     bool
}

func (s SummaryRow) ToThreatBreakdown() domain.ThreatBreakdown {
	engine := scoring.NewEngine(scoring.DefaultSettings)
	snapshot := time.Unix(0, 0).UTC()
	if !s.LastActivity.IsZero() {
		snapshot = s.LastActivity
	}
	input := scoring.EnrichedPilotInput{
		SnapshotAt:     snapshot,
		RecentKills:    scoring.OptionalFloat{Value: float64(s.RecentKills), Known: s.RecentKillsKnown},
		RecentLosses:   scoring.OptionalFloat{Value: float64(s.RecentLosses), Known: s.RecentLossesKnown},
		DangerRatio:    scoring.OptionalFloat{Value: s.DangerRatio, Known: s.DangerRatioKnown},
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
		Total:            res.ThreatScore,
		ThreatScore:      res.ThreatScore,
		RawThreatScore:   res.RawThreatScore,
		ThreatBand:       res.ThreatBand,
		AssessmentState:  res.AssessmentState,
		ThreatReasons:    res.ThreatReasons,
		Breakdown:        breakdown,
		Confidence:       res.Confidence,
		DataCompleteness: res.DataCompleteness,
		RecentKills:      s.RecentKills,
		RecentLosses:     s.RecentLosses,
		DangerPercent:    s.DangerRatio * 100,
		Notes:            "summary derived",
	}
}

type KillmailTimeIssue string

const (
	KillmailTimeIssueNone    KillmailTimeIssue = ""
	KillmailTimeIssueMissing KillmailTimeIssue = "missing"
	KillmailTimeIssueInvalid KillmailTimeIssue = "invalid"
)

type KillmailTimestampClass string

const (
	KillmailTimestampValid   KillmailTimestampClass = "valid"
	KillmailTimestampMissing KillmailTimestampClass = "missing"
	KillmailTimestampInvalid KillmailTimestampClass = "invalid"
)

type Killmail struct {
	KillID            int64
	OccurredAt        time.Time
	OccurredAtInvalid bool
	OccurredAtIssue   KillmailTimeIssue
	TimestampClass    KillmailTimestampClass
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
