package buildscript_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestBuildBatSubcommandsMapToExpectedCommands(t *testing.T) {
	content, err := os.ReadFile(filepath.Join("..", "..", "build.bat"))
	if err != nil {
		t.Fatalf("read build.bat: %v", err)
	}
	script := string(content)

	checks := map[string]string{
		"frontend-install": "npm ci",
		"frontend-dev":     "npm run dev",
		"frontend-build":   "npm run build",
		"wails-generate":   "wails generate module",
		"dev":              "wails dev",
		"test":             "go test ./...",
		"build":            "wails build -clean",
		"release":          "wails build -clean -nsis",
		"clean":            "rmdir /s /q",
	}

	for subcommand, expected := range checks {
		if !strings.Contains(script, subcommand) {
			t.Fatalf("build.bat missing subcommand switch for %q", subcommand)
		}
		if !strings.Contains(script, expected) {
			t.Fatalf("build.bat missing expected invocation %q for %q", expected, subcommand)
		}
	}

	for _, expected := range []string{"main.version", "main.commit", "main.date"} {
		if !strings.Contains(script, expected) {
			t.Fatalf("build.bat missing version metadata flag %q", expected)
		}
	}
}
