package parser

import (
	"strings"
	"testing"
)

func TestOrchestratorMixedMalformedInputUsesFallbackWithWarnings(t *testing.T) {
	raw := "[12:01] <FC> Alice Prime\n$AAPL\n{{junk}}\nBob Delta\nALICE PRIME"
	got := NewOrchestrator().Parse(raw)

	if got.Strategy != "FallbackLooseParser" {
		t.Fatalf("expected fallback strategy, got %s", got.Strategy)
	}
	if len(got.Candidates) == 0 {
		t.Fatal("expected partial candidates")
	}
	warns := strings.Join(got.Warnings, ",")
	if !strings.Contains(warns, "duplicates_removed") || !strings.Contains(warns, "suspicious_artifacts_detected") {
		t.Fatalf("expected warnings not found: %v", got.Warnings)
	}
}
