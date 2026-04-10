package parser

import (
	"os"
	"path/filepath"
	"testing"
)

func readFixture(t *testing.T, name string) string {
	t.Helper()
	buf, err := os.ReadFile(filepath.Join("..", "..", "testdata", "parser", name))
	if err != nil {
		t.Fatalf("read fixture %s: %v", name, err)
	}
	return string(buf)
}

func TestStrategiesWithFixtures(t *testing.T) {
	fixtures := []struct {
		name            string
		file            string
		strategy        ParserStrategy
		minConfidence   float64
		expectedKind    InputKind
		expectedCandMin int
	}{
		{"local list", "clean_local_list.txt", LocalMemberListParser{}, 0.75, InputKindLocalMemberList, 3},
		{"chat transcript", "timestamp_chat_transcript.txt", ChatTranscriptParser{}, 0.8, InputKindChatTranscript, 3},
		{"ticker noise fallback", "corp_ticker_noise.txt", FallbackLooseParser{}, 0.3, InputKindUnknown, 0},
	}

	for _, tc := range fixtures {
		t.Run(tc.name, func(t *testing.T) {
			raw := readFixture(t, tc.file)
			_, lines := NormalizeText(raw)
			got := tc.strategy.Parse(raw, lines)
			if got.Confidence < tc.minConfidence {
				t.Fatalf("confidence too low: %f < %f", got.Confidence, tc.minConfidence)
			}
			if got.InputKind != tc.expectedKind {
				t.Fatalf("input kind mismatch: got %s want %s", got.InputKind, tc.expectedKind)
			}
			if len(got.Candidates) < tc.expectedCandMin {
				t.Fatalf("candidate count too low: got %d", len(got.Candidates))
			}
		})
	}
}
