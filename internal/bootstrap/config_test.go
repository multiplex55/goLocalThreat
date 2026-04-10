package bootstrap

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
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

func TestLoadProviderConfigFromEnvRealModeMissingESIEnvReturnsStructuredError(t *testing.T) {
	t.Setenv("PROVIDER_MODE", "real")
	t.Setenv("ESI_BASE_URL", "")
	t.Setenv("GOLT_ESI_BASE_URL", "")
	t.Setenv("ZKILL_BASE_URL", "https://zkillboard.com")

	_, err := LoadProviderConfigFromEnv()
	if err == nil {
		t.Fatal("expected missing ESI base URL to fail")
	}

	var cfgErr *ConfigValidationError
	if !errors.As(err, &cfgErr) {
		t.Fatalf("expected ConfigValidationError, got %T: %v", err, err)
	}
	if cfgErr.Mode != ProviderModeReal {
		t.Fatalf("expected real mode in validation error, got %q", cfgErr.Mode)
	}

	msg := err.Error()
	for _, expected := range []string{
		"mode=\"real\"",
		"ESI_BASE_URL",
		"GOLT_ESI_BASE_URL",
		"set ESI_BASE_URL=",
		"export ESI_BASE_URL=",
	} {
		if !strings.Contains(msg, expected) {
			t.Fatalf("expected error message to contain %q, got %q", expected, msg)
		}
	}
}

func TestLoadProviderConfigFromEnvRealModeOnlyESIBaseURLSetPasses(t *testing.T) {
	t.Setenv("PROVIDER_MODE", "real")
	t.Setenv("ESI_BASE_URL", "https://esi.evetech.net/latest")
	t.Setenv("GOLT_ESI_BASE_URL", "")
	t.Setenv("ZKILL_BASE_URL", "https://zkillboard.com")

	cfg, err := LoadProviderConfigFromEnv()
	if err != nil {
		t.Fatalf("expected config to pass, got error: %v", err)
	}
	if cfg.ESIBaseURL != "https://esi.evetech.net/latest" {
		t.Fatalf("unexpected ESI URL: %q", cfg.ESIBaseURL)
	}
}

func TestLoadProviderConfigFromEnvRealModeOnlyLegacyESIBaseURLSetPasses(t *testing.T) {
	t.Setenv("PROVIDER_MODE", "real")
	t.Setenv("ESI_BASE_URL", "")
	t.Setenv("GOLT_ESI_BASE_URL", "https://legacy-esi.example.com/latest")
	t.Setenv("ZKILL_BASE_URL", "https://zkillboard.com")

	cfg, err := LoadProviderConfigFromEnv()
	if err != nil {
		t.Fatalf("expected config to pass, got error: %v", err)
	}
	if cfg.ESIBaseURL != "https://legacy-esi.example.com/latest" {
		t.Fatalf("expected legacy ESI URL, got %q", cfg.ESIBaseURL)
	}
}

func TestLoadProviderConfigFromEnvRealModeBothESIEnvSetUsesPrimaryPrecedence(t *testing.T) {
	t.Setenv("PROVIDER_MODE", "real")
	t.Setenv("ESI_BASE_URL", "https://esi-primary.example.com/latest")
	t.Setenv("GOLT_ESI_BASE_URL", "https://esi-legacy.example.com/latest")
	t.Setenv("ZKILL_BASE_URL", "https://zkillboard.com")

	cfg, err := LoadProviderConfigFromEnv()
	if err != nil {
		t.Fatalf("expected config to pass, got error: %v", err)
	}
	if cfg.ESIBaseURL != "https://esi-primary.example.com/latest" {
		t.Fatalf("expected primary env var precedence, got %q", cfg.ESIBaseURL)
	}
}

func TestLoadProviderConfigFromEnvNonRealModeMissingESIEnvDoesNotFail(t *testing.T) {
	t.Setenv("PROVIDER_MODE", "noop")
	t.Setenv("ESI_BASE_URL", "")
	t.Setenv("GOLT_ESI_BASE_URL", "")
	t.Setenv("ZKILL_BASE_URL", "")

	cfg, err := LoadProviderConfigFromEnv()
	if err != nil {
		t.Fatalf("expected noop mode to ignore real provider URL requirement: %v", err)
	}
	if cfg.Mode != ProviderModeNoop {
		t.Fatalf("expected noop mode, got %q", cfg.Mode)
	}
}

func TestResolveESIBaseURLFromEnvIsolated(t *testing.T) {
	cases := []struct {
		name    string
		primary string
		legacy  string
		want    string
	}{
		{name: "none set", primary: "", legacy: "", want: ""},
		{name: "primary set", primary: "https://primary.example.com", legacy: "", want: "https://primary.example.com"},
		{name: "legacy set", primary: "", legacy: "https://legacy.example.com", want: "https://legacy.example.com"},
		{name: "both set primary wins", primary: "https://primary.example.com", legacy: "https://legacy.example.com", want: "https://primary.example.com"},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Setenv(ESIBaseURLPrimaryEnv, tc.primary)
			t.Setenv(ESIBaseURLLegacyEnv, tc.legacy)
			if got := resolveESIBaseURLFromEnv(); got != tc.want {
				t.Fatalf("resolveESIBaseURLFromEnv() = %q, want %q", got, tc.want)
			}
		})
	}
}
