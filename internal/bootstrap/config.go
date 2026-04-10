package bootstrap

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"
)

const (
	DefaultVersion = "dev"
	DefaultCommit  = "unknown"
	DefaultDate    = "unknown"

	DefaultAppName       = "goLocalThreat"
	DefaultAppIdentifier = "io.golocalthreat.app"
	DefaultFrontendDir   = "frontend"

	DefaultProviderTimeout = 5 * time.Second
)

type ProviderMode string

const (
	ProviderModeReal ProviderMode = "real"
	ProviderModeNoop ProviderMode = "noop"
)

type BuildMetadata struct {
	Version string
	Commit  string
	Date    string
}

type StartupWiring struct {
	AppName       string
	AppIdentifier string
	FrontendDir   string
}

type ProviderConfig struct {
	Mode         ProviderMode
	Timeout      time.Duration
	ESIBaseURL   string
	ZKillBaseURL string
}

const (
	ESIBaseURLPrimaryEnv  = "ESI_BASE_URL"
	ESIBaseURLLegacyEnv   = "GOLT_ESI_BASE_URL"
	ZKillBaseURLPrimary   = "ZKILL_BASE_URL"
	ZKillBaseURLLegacyEnv = "GOLT_ZKILL_BASE_URL"
)

type ConfigValidationError struct {
	Mode             ProviderMode
	CheckedVariables []string
	Reason           string
}

func (e *ConfigValidationError) Error() string {
	return fmt.Sprintf(
		"provider configuration error: mode=%q checked=%s: %s. remediation (Windows): set %s=https://esi.evetech.net/latest. remediation (Unix): export %s=https://esi.evetech.net/latest",
		e.Mode,
		strings.Join(e.CheckedVariables, ","),
		e.Reason,
		ESIBaseURLPrimaryEnv,
		ESIBaseURLPrimaryEnv,
	)
}

func (e *ConfigValidationError) Is(target error) bool {
	_, ok := target.(*ConfigValidationError)
	return ok
}

func ResolveBuildMetadata(version, commit, date string) BuildMetadata {
	if version == "" {
		version = DefaultVersion
	}
	if commit == "" {
		commit = DefaultCommit
	}
	if date == "" {
		date = DefaultDate
	}
	return BuildMetadata{Version: version, Commit: commit, Date: date}
}

func DefaultStartupWiring() StartupWiring {
	return StartupWiring{
		AppName:       DefaultAppName,
		AppIdentifier: DefaultAppIdentifier,
		FrontendDir:   DefaultFrontendDir,
	}
}

func LoadProviderConfigFromEnv() (ProviderConfig, error) {
	modeRaw := strings.ToLower(strings.TrimSpace(firstEnv("PROVIDER_MODE", "GOLT_PROVIDER_MODE")))
	mode := ProviderModeReal
	switch modeRaw {
	case "", string(ProviderModeReal):
		mode = ProviderModeReal
	case string(ProviderModeNoop):
		mode = ProviderModeNoop
	default:
		return ProviderConfig{}, fmt.Errorf("invalid provider mode %q: set PROVIDER_MODE=real|noop", modeRaw)
	}

	timeout := DefaultProviderTimeout
	if raw := strings.TrimSpace(firstEnv("PROVIDER_TIMEOUT", "GOLT_PROVIDER_TIMEOUT")); raw != "" {
		parsed, err := time.ParseDuration(raw)
		if err != nil || parsed <= 0 {
			return ProviderConfig{}, fmt.Errorf("invalid provider timeout %q: set PROVIDER_TIMEOUT to a positive duration (e.g. 5s)", raw)
		}
		timeout = parsed
	}

	cfg := ProviderConfig{
		Mode:         mode,
		Timeout:      timeout,
		ESIBaseURL:   resolveESIBaseURLFromEnv(),
		ZKillBaseURL: strings.TrimSpace(firstEnv(ZKillBaseURLPrimary, ZKillBaseURLLegacyEnv)),
	}
	if !isRealProviderMode(cfg.Mode) {
		return cfg, nil
	}

	if cfg.ESIBaseURL == "" {
		return ProviderConfig{}, &ConfigValidationError{
			Mode:             cfg.Mode,
			CheckedVariables: []string{ESIBaseURLPrimaryEnv, ESIBaseURLLegacyEnv},
			Reason:           "real provider mode requires ESI_BASE_URL (or GOLT_ESI_BASE_URL) to be set",
		}
	}
	if cfg.ZKillBaseURL == "" {
		return ProviderConfig{}, &ConfigValidationError{
			Mode:             cfg.Mode,
			CheckedVariables: []string{ZKillBaseURLPrimary, ZKillBaseURLLegacyEnv},
			Reason:           "real provider mode requires ZKILL_BASE_URL (or GOLT_ZKILL_BASE_URL) to be set",
		}
	}
	if err := validateAbsoluteURL(cfg.ESIBaseURL, "ESI_BASE_URL"); err != nil {
		return ProviderConfig{}, err
	}
	if err := validateAbsoluteURL(cfg.ZKillBaseURL, "ZKILL_BASE_URL"); err != nil {
		return ProviderConfig{}, err
	}

	return cfg, nil
}

func isRealProviderMode(mode ProviderMode) bool {
	return mode == ProviderModeReal
}

func validateAbsoluteURL(raw, name string) error {
	parsed, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("invalid %s %q: %w", name, raw, err)
	}
	if parsed.Scheme == "" || parsed.Host == "" {
		return fmt.Errorf("invalid %s %q: must include scheme and host", name, raw)
	}
	return nil
}

func firstEnv(keys ...string) string {
	for _, key := range keys {
		if val := os.Getenv(key); strings.TrimSpace(val) != "" {
			return val
		}
	}
	return ""
}

func resolveESIBaseURLFromEnv() string {
	// Deterministic precedence: prefer ESI_BASE_URL, then fallback to legacy GOLT_ESI_BASE_URL.
	return strings.TrimSpace(firstEnv(ESIBaseURLPrimaryEnv, ESIBaseURLLegacyEnv))
}

func IsConfigValidationError(err error) bool {
	var cfgErr *ConfigValidationError
	return errors.As(err, &cfgErr)
}
