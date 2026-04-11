package zkill

import (
	"os"
	"path/filepath"
	"testing"
)

func readParityFixture(t *testing.T, name string) []byte {
	t.Helper()
	path := filepath.Join("testdata", "parity", name)
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read fixture %s: %v", path, err)
	}
	return b
}

func TestParityFixturesSummaryTransformPaths(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name         string
		fixture      string
		expectID     int64
		expectKills  int
		expectLosses int
	}{
		{name: "solo", fixture: "solo.stats.json", expectID: 900001, expectKills: 4, expectLosses: 1},
		{name: "gang_fc", fixture: "gang_fc.stats.json", expectID: 900002, expectKills: 2, expectLosses: 2},
		{name: "low_activity", fixture: "low_activity.stats.json", expectID: 900003, expectKills: 0, expectLosses: 0},
		{name: "recent_kl", fixture: "recent_kl.stats.json", expectID: 900004, expectKills: 1, expectLosses: 1},
		{name: "timestamp_warning", fixture: "timestamp_warning.stats.json", expectID: 900005, expectKills: 3, expectLosses: 1},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			row, warning, err := parseSummaryRow(readParityFixture(t, tc.fixture))
			if err != nil {
				t.Fatalf("parseSummaryRow(%s) error: %v", tc.fixture, err)
			}
			if warning != nil {
				t.Fatalf("unexpected parse drift warning in stable fixture: %#v", warning)
			}
			if row.CharacterID != tc.expectID {
				t.Fatalf("id transform mismatch: got %d want %d", row.CharacterID, tc.expectID)
			}
			if row.RecentKills != tc.expectKills || row.RecentLosses != tc.expectLosses {
				t.Fatalf("combat transform mismatch: got kills=%d losses=%d", row.RecentKills, row.RecentLosses)
			}
			if !row.RecentKillsKnown || !row.RecentLossesKnown || !row.DangerRatioKnown {
				t.Fatalf("expected known metrics to be set: %#v", row)
			}
		})
	}
}

func TestParityFixturesDetailTransformPaths(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name              string
		fixture           string
		expectCount       int
		expectInvalidTime int
	}{
		{name: "solo", fixture: "solo.detail.json", expectCount: 3, expectInvalidTime: 0},
		{name: "gang_fc", fixture: "gang_fc.detail.json", expectCount: 2, expectInvalidTime: 0},
		{name: "low_activity", fixture: "low_activity.detail.json", expectCount: 0, expectInvalidTime: 0},
		{name: "recent_kl", fixture: "recent_kl.detail.json", expectCount: 2, expectInvalidTime: 0},
		{name: "timestamp_warning", fixture: "timestamp_warning.detail.json", expectCount: 2, expectInvalidTime: 2},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			kms, invalidCount, err := parseKillmails(readParityFixture(t, tc.fixture))
			if err != nil {
				t.Fatalf("parseKillmails(%s) error: %v", tc.fixture, err)
			}
			if len(kms) != tc.expectCount {
				t.Fatalf("killmail transform mismatch: got %d want %d", len(kms), tc.expectCount)
			}
			if invalidCount != tc.expectInvalidTime {
				t.Fatalf("invalid timestamp transform mismatch: got %d want %d", invalidCount, tc.expectInvalidTime)
			}
		})
	}
}
