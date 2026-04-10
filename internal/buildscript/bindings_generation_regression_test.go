package buildscript_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCanonicalGenerationOutputHasNoTimeTimeUnresolvedWarnings(t *testing.T) {
	content, err := os.ReadFile(filepath.Join("..", "..", "frontend", "wailsjs", "go", "app", "AppService.ts"))
	if err != nil {
		t.Fatalf("read generated AppService bindings: %v", err)
	}
	bindings := string(content)
	if strings.Contains(bindings, "time.Time") {
		t.Fatalf("generated bindings still include unresolved Go type reference time.Time")
	}
}
