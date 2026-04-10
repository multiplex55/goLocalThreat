package scoring

func BandForScore(score float64, t BandThresholds) string {
	switch {
	case score >= t.Critical:
		return "critical"
	case score >= t.High:
		return "high"
	case score >= t.Medium:
		return "medium"
	case score >= t.Low:
		return "low"
	default:
		return "minimal"
	}
}
