package parser

import "testing"

func TestCaseInsensitiveDedupePreservesFirstSeenOrder(t *testing.T) {
	lines := []string{"Alice Prime", "alice prime", "BOB", "Bob", "Charlie"}
	candidates, _, duplicates, _ := extractCandidates(lines)

	want := []string{"Alice Prime", "BOB", "Charlie"}
	if len(candidates) != len(want) {
		t.Fatalf("candidate length mismatch: got %d want %d", len(candidates), len(want))
	}
	for i := range want {
		if candidates[i] != want[i] {
			t.Fatalf("candidate[%d] = %q, want %q", i, candidates[i], want[i])
		}
	}
	if duplicates != 2 {
		t.Fatalf("expected 2 duplicates removed, got %d", duplicates)
	}
}
