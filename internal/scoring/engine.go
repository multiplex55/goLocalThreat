package scoring

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"time"
)

type OptionalFloat struct {
	Value float64
	Known bool
}

type OptionalTime struct {
	Value time.Time
	Known bool
}

type EnrichedPilotInput struct {
	SnapshotAt     time.Time
	RecentKills    OptionalFloat
	RecentLosses   OptionalFloat
	DangerRatio    OptionalFloat
	AvgAttackers   OptionalFloat
	SoloKillRatio  OptionalFloat
	LastActivityAt OptionalTime
	SecurityStatus OptionalFloat
	InHostileSpace *bool
}

type Weights struct {
	Activity    float64
	Lethality   float64
	SoloRisk    float64
	Recentness  float64
	Context     float64
	Uncertainty float64
}

type BandThresholds struct {
	Low      float64
	Medium   float64
	High     float64
	Critical float64
}

type Settings struct {
	Weights    Weights
	Thresholds BandThresholds
}

type Breakdown struct {
	Component    string  `json:"component"`
	Raw          float64 `json:"raw"`
	Weight       float64 `json:"weight"`
	Contribution float64 `json:"contribution"`
	Unknown      bool    `json:"unknown"`
	Explanation  string  `json:"explanation"`
}

type Result struct {
	ThreatScore      float64     `json:"threatScore"`
	RawThreatScore   float64     `json:"rawThreatScore"`
	ThreatBand       string      `json:"threatBand"`
	AssessmentState  string      `json:"assessmentState"`
	ThreatReasons    []string    `json:"threatReasons"`
	Breakdown        []Breakdown `json:"threatBreakdown"`
	Confidence       float64     `json:"confidence"`
	DataCompleteness float64     `json:"dataCompleteness"`
}

type Engine struct {
	settings Settings
}

func NewEngine(settings Settings) Engine {
	return Engine{settings: settings}
}

func (e Engine) Score(input EnrichedPilotInput) Result {
	parts := []Breakdown{
		e.activity(input),
		e.lethality(input),
		e.soloRisk(input),
		e.recentness(input),
		e.context(input),
	}

	unknown := 0
	knownWeight := 0.0
	for _, p := range parts {
		if p.Unknown {
			unknown++
			continue
		}
		knownWeight += p.Weight
	}
	totalWeight := e.settings.Weights.Activity + e.settings.Weights.Lethality + e.settings.Weights.SoloRisk + e.settings.Weights.Recentness + e.settings.Weights.Context
	dataCompleteness := 0.0
	if totalWeight > 0 {
		dataCompleteness = clamp(knownWeight/totalWeight, 0, 1)
	}
	confidence := clamp(0.3+(0.7*dataCompleteness), 0.2, 1.0)

	knownContribution := 0.0
	for i := range parts {
		parts[i].Contribution = round2(parts[i].Raw * parts[i].Weight)
		if !parts[i].Unknown {
			knownContribution += parts[i].Contribution
		}
	}

	uncertaintyRaw := round2((1.0 - confidence) * 100)
	uncertainty := Breakdown{
		Component:    "uncertainty",
		Raw:          uncertaintyRaw,
		Weight:       e.settings.Weights.Uncertainty,
		Contribution: 0,
		Unknown:      false,
		Explanation:  fmt.Sprintf("Known components %d/%d; confidence %.2f", len(parts)-unknown, len(parts), confidence),
	}
	parts = append(parts, uncertainty)

	rawThreat := 0.0
	if knownWeight > 0 {
		rawThreat = round2(knownContribution / knownWeight)
	}
	band := BandForScore(rawThreat, e.settings.Thresholds)
	state := "complete-data"
	if dataCompleteness < 0.35 {
		state = "insufficient-data"
	} else if dataCompleteness < 0.999 {
		state = "partial-data"
	}
	reasons := topReasons(parts)
	sort.Slice(parts, func(i, j int) bool {
		if parts[i].Contribution == parts[j].Contribution {
			return parts[i].Component < parts[j].Component
		}
		return parts[i].Contribution > parts[j].Contribution
	})
	return Result{
		ThreatScore:      rawThreat,
		RawThreatScore:   rawThreat,
		ThreatBand:       band,
		AssessmentState:  state,
		ThreatReasons:    reasons,
		Breakdown:        parts,
		Confidence:       confidence,
		DataCompleteness: dataCompleteness,
	}
}

func (e Engine) activity(input EnrichedPilotInput) Breakdown {
	if !input.RecentKills.Known || !input.RecentLosses.Known {
		return Breakdown{Component: "activity", Weight: e.settings.Weights.Activity, Unknown: true, Explanation: "Recent kills/losses unknown"}
	}
	volume := input.RecentKills.Value + input.RecentLosses.Value
	raw := clamp((volume/20.0)*100.0, 0, 100)
	return Breakdown{Component: "activity", Raw: raw, Weight: e.settings.Weights.Activity, Explanation: fmt.Sprintf("Volume %.1f from kills %.1f + losses %.1f", volume, input.RecentKills.Value, input.RecentLosses.Value)}
}

func (e Engine) lethality(input EnrichedPilotInput) Breakdown {
	if !input.RecentKills.Known || !input.RecentLosses.Known || !input.DangerRatio.Known {
		return Breakdown{Component: "lethality", Weight: e.settings.Weights.Lethality, Unknown: true, Explanation: "Kill efficiency or danger ratio unknown"}
	}
	total := input.RecentKills.Value + input.RecentLosses.Value
	if total <= 0 {
		return Breakdown{Component: "lethality", Weight: e.settings.Weights.Lethality, Explanation: "No recent combat volume"}
	}
	eff := input.RecentKills.Value / total
	raw := clamp((eff*70)+(clamp(input.DangerRatio.Value/2.0, 0, 1)*30), 0, 100)
	return Breakdown{Component: "lethality", Raw: raw, Weight: e.settings.Weights.Lethality, Explanation: fmt.Sprintf("Efficiency %.2f with danger %.2f", eff, input.DangerRatio.Value)}
}

func (e Engine) soloRisk(input EnrichedPilotInput) Breakdown {
	if !input.AvgAttackers.Known || !input.SoloKillRatio.Known {
		return Breakdown{Component: "soloRisk", Weight: e.settings.Weights.SoloRisk, Unknown: true, Explanation: "Solo behavior data unknown"}
	}
	soloPressure := clamp(1.0/input.AvgAttackers.Value, 0, 1)
	raw := clamp((input.SoloKillRatio.Value*60)+(soloPressure*40), 0, 100)
	return Breakdown{Component: "soloRisk", Raw: raw, Weight: e.settings.Weights.SoloRisk, Explanation: fmt.Sprintf("Solo ratio %.2f, avg attackers %.2f", input.SoloKillRatio.Value, input.AvgAttackers.Value)}
}

func (e Engine) recentness(input EnrichedPilotInput) Breakdown {
	if !input.LastActivityAt.Known || input.SnapshotAt.IsZero() {
		return Breakdown{Component: "recentness", Weight: e.settings.Weights.Recentness, Unknown: true, Explanation: "Last activity timestamp unknown"}
	}
	days := input.SnapshotAt.Sub(input.LastActivityAt.Value).Hours() / 24
	raw := clamp(100-(days*5), 0, 100)
	return Breakdown{Component: "recentness", Raw: raw, Weight: e.settings.Weights.Recentness, Explanation: fmt.Sprintf("Last seen %.1f days ago", days)}
}

func (e Engine) context(input EnrichedPilotInput) Breakdown {
	if !input.SecurityStatus.Known || input.InHostileSpace == nil {
		return Breakdown{Component: "context", Weight: e.settings.Weights.Context, Unknown: true, Explanation: "Security/context signals unknown"}
	}
	secPressure := clamp((5-input.SecurityStatus.Value)/10, 0, 1) * 60
	hostile := 0.0
	if *input.InHostileSpace {
		hostile = 40
	}
	raw := clamp(secPressure+hostile, 0, 100)
	return Breakdown{Component: "context", Raw: raw, Weight: e.settings.Weights.Context, Explanation: fmt.Sprintf("Security %.2f, hostile space %t", input.SecurityStatus.Value, *input.InHostileSpace)}
}

func topReasons(parts []Breakdown) []string {
	ordered := append([]Breakdown(nil), parts...)
	sort.Slice(ordered, func(i, j int) bool {
		if ordered[i].Contribution == ordered[j].Contribution {
			return ordered[i].Component < ordered[j].Component
		}
		return ordered[i].Contribution > ordered[j].Contribution
	})
	reasons := make([]string, 0, 3)
	for _, p := range ordered {
		if len(reasons) == 3 {
			break
		}
		if p.Contribution <= 0 {
			continue
		}
		label := p.Component
		if p.Unknown {
			label += " unknown"
		}
		reasons = append(reasons, fmt.Sprintf("%s %.2f (%s)", label, p.Contribution, strings.ToLower(p.Explanation)))
	}
	return reasons
}

func clamp(v, lo, hi float64) float64 {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func round2(v float64) float64 { return math.Round(v*100) / 100 }
