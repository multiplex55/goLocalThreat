package bootstrap

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func repoRoot(t *testing.T) string {
	t.Helper()
	return filepath.Clean(filepath.Join("..", ".."))
}

func TestResolveBuildMetadataDefaultsAndStartupIdentifiers(t *testing.T) {
	meta := ResolveBuildMetadata("", "", "")
	if meta.Version != DefaultVersion || meta.Commit != DefaultCommit || meta.Date != DefaultDate {
		t.Fatalf("unexpected defaults: %+v", meta)
	}

	wiring := DefaultStartupWiring()
	if wiring.AppName == "" || wiring.AppIdentifier == "" || wiring.FrontendDir == "" {
		t.Fatalf("startup wiring contains empty identifiers: %+v", wiring)
	}
}

func TestBootstrapRequiredFilesExist(t *testing.T) {
	root := repoRoot(t)
	required := []string{
		"wails.json",
		"main.go",
		"build",
		filepath.Join("frontend", "index.html"),
		filepath.Join("frontend", "package.json"),
		filepath.Join("frontend", "src", "main.tsx"),
	}

	for _, rel := range required {
		if _, err := os.Stat(filepath.Join(root, rel)); err != nil {
			t.Fatalf("required bootstrap path missing %q: %v", rel, err)
		}
	}
}

func TestWailsJSONCriticalShape(t *testing.T) {
	root := repoRoot(t)
	data, err := os.ReadFile(filepath.Join(root, "wails.json"))
	if err != nil {
		t.Fatalf("read wails.json: %v", err)
	}

	var cfg map[string]any
	if err := json.Unmarshal(data, &cfg); err != nil {
		t.Fatalf("parse wails.json: %v", err)
	}

	checks := map[string]string{
		"frontend:dir":     "frontend",
		"frontend:install": "npm install",
		"frontend:build":   "npm run build",
	}

	for key, want := range checks {
		value, ok := cfg[key]
		if !ok {
			t.Fatalf("missing required key %q", key)
		}
		if value != want {
			t.Fatalf("unexpected %s: got %v want %q", key, value, want)
		}
	}
}
