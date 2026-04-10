package buildscript_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func readRootFile(t *testing.T, name string) string {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("..", "..", name))
	if err != nil {
		t.Fatalf("read %s: %v", name, err)
	}
	return string(b)
}

func TestREADMEContainsRunSectionHeadingsAndRequiredEnvVars(t *testing.T) {
	readme := readRootFile(t, "README.md")

	headings := []string{
		"## Run the application",
		"### Prerequisites",
		"### Development run + generation workflow",
		"### Troubleshooting startup configuration",
		"### Environment variable reference (precedence + defaults)",
	}
	for _, heading := range headings {
		if !strings.Contains(readme, heading) {
			t.Fatalf("README missing heading %q", heading)
		}
	}

	requiredVars := []string{
		"PROVIDER_MODE",
		"ESI_BASE_URL",
		"GOLT_ESI_BASE_URL",
		"ZKILL_BASE_URL",
		"GOLT_ZKILL_BASE_URL",
		"PROVIDER_TIMEOUT",
		"GOLT_PROVIDER_TIMEOUT",
	}
	for _, key := range requiredVars {
		if !strings.Contains(readme, key) {
			t.Fatalf("README missing environment variable %q", key)
		}
	}
}

func TestREADMECommandBlocksMatchProjectScripts(t *testing.T) {
	readme := readRootFile(t, "README.md")
	buildBat := readRootFile(t, "build.bat")

	readmeCommands := []string{
		"build.bat frontend-install",
		"build.bat wails-generate",
		"scripts/update-bindings-sentinel.sh",
		"build.bat dev",
		"wails generate module",
		"wails dev",
	}
	for _, cmd := range readmeCommands {
		if !strings.Contains(readme, cmd) {
			t.Fatalf("README missing expected command %q", cmd)
		}
	}

	buildBatSubcommands := []string{"frontend-install", "wails-generate", "dev"}
	for _, sub := range buildBatSubcommands {
		if !strings.Contains(buildBat, "if /I \"%~1\"==\""+sub+"\"") {
			t.Fatalf("build.bat missing subcommand %q referenced by README", sub)
		}
	}

	if _, err := os.Stat(filepath.Join("..", "..", "scripts", "update-bindings-sentinel.sh")); err != nil {
		t.Fatalf("README references scripts/update-bindings-sentinel.sh but file check failed: %v", err)
	}
}

func TestREADMETroubleshootingContainsKnownStartupErrorMessage(t *testing.T) {
	readme := readRootFile(t, "README.md")

	exactError := "provider configuration error: mode=\"real\" checked=ESI_BASE_URL,GOLT_ESI_BASE_URL: real provider mode requires ESI_BASE_URL (or GOLT_ESI_BASE_URL) to be set. remediation (Windows): set ESI_BASE_URL=https://esi.evetech.net/latest. remediation (Unix): export ESI_BASE_URL=https://esi.evetech.net/latest"
	if !strings.Contains(readme, exactError) {
		t.Fatalf("README troubleshooting is missing exact startup error string")
	}
}
