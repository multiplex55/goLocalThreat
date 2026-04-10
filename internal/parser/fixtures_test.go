package parser

import "testing"

func TestFixtureDrivenInputs(t *testing.T) {
	cases := []struct {
		file             string
		expectCandidates int
	}{
		{"clean_local_list.txt", 3},
		{"timestamp_chat_transcript.txt", 3},
		{"corp_ticker_noise.txt", 0},
		{"duplicates.txt", 2},
		{"empty_clipboard.txt", 0},
		{"mixed_valid_invalid_lines.txt", 2},
	}

	orchestrator := NewOrchestrator()
	for _, tc := range cases {
		raw := readFixture(t, tc.file)
		got := orchestrator.Parse(raw)
		if len(got.Candidates) != tc.expectCandidates {
			t.Fatalf("%s: got %d candidates, want %d", tc.file, len(got.Candidates), tc.expectCandidates)
		}
	}
}
