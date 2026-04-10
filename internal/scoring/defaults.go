package scoring

var DefaultSettings = Settings{
	Weights: Weights{
		Activity:    0.28,
		Lethality:   0.25,
		SoloRisk:    0.14,
		Recentness:  0.17,
		Context:     0.10,
		Uncertainty: 0.22,
	},
	Thresholds: BandThresholds{Low: 25, Medium: 45, High: 65, Critical: 85},
}
