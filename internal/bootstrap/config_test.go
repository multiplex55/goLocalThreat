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

func TestLoadProviderConfigFromEnvDefaultsToRealWhenUnset(t *testing.T) {
	t.Setenv("PROVIDER_MODE", "")
	t.Setenv("GOLT_PROVIDER_MODE", "")
	t.Setenv("ESI_BASE_URL", "https://esi.evetech.net/latest")
	t.Setenv("ZKILL_BASE_URL", "https://zkillboard.com")

	cfg, err := LoadProviderConfigFromEnv()
	if err != nil {
		t.Fatalf("LoadProviderConfigFromEnv returned error: %v", err)
	}
	if cfg.Mode != ProviderModeReal {
		t.Fatalf("expected default mode real, got %q", cfg.Mode)
	}
}

func TestLoadProviderConfigFromEnvAcceptsExplicitNoop(t *testing.T) {
	t.Setenv("PROVIDER_MODE", "noop")
	t.Setenv("GOLT_PROVIDER_MODE", "")
	t.Setenv("ESI_BASE_URL", "")
	t.Setenv("ZKILL_BASE_URL", "")

	cfg, err := LoadProviderConfigFromEnv()
	if err != nil {
		t.Fatalf("LoadProviderConfigFromEnv returned error: %v", err)
	}
	if cfg.Mode != ProviderModeNoop {
		t.Fatalf("expected noop mode, got %q", cfg.Mode)
	}
}

func TestLoadProviderConfigFromEnvRejectsInvalidMode(t *testing.T) {
	t.Setenv("PROVIDER_MODE", "invalid")
	t.Setenv("GOLT_PROVIDER_MODE", "")

	_, err := LoadProviderConfigFromEnv()
	if err == nil {
		t.Fatal("expected invalid provider mode to be rejected")
	}
}
