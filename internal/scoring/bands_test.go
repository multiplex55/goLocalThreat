package scoring

import "testing"

func TestBandForScoreUsesThresholds(t *testing.T) {
	th := BandThresholds{Low: 10, Medium: 30, High: 60, Critical: 90}
	cases := []struct {
		score float64
		want  string
	}{
		{0, "minimal"},
		{10, "low"},
		{30, "medium"},
		{60, "high"},
		{90, "critical"},
	}
	for _, tc := range cases {
		if got := BandForScore(tc.score, th); got != tc.want {
			t.Fatalf("score %.1f: want %q got %q", tc.score, tc.want, got)
		}
	}
}
