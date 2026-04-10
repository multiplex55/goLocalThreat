package parser

import (
	"testing"
)

func TestNormalizeText(t *testing.T) {
	raw := "Alice\r\n\r\n [12:44] <FC> Bob \r\n\tCharlie\r"
	normalized, lines := NormalizeText(raw)

	if normalized != "Alice\nBob\nCharlie" {
		t.Fatalf("unexpected normalized text: %q", normalized)
	}
	if len(lines) != 3 {
		t.Fatalf("expected 3 lines, got %d", len(lines))
	}
}
