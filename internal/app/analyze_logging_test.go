package app

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"strings"
	"testing"

	"golocalthreat/internal/domain"
	"golocalthreat/internal/providers/esi"
	"golocalthreat/internal/providers/zkill"
)

type loggingESIProvider struct {
	resolved     esi.ResolvedNames
	identities   []domain.CharacterIdentity
	resolveErr   error
	characterErr error
}

func (p loggingESIProvider) ResolveNames(context.Context, []string) (esi.ResolvedNames, error) {
	if p.resolveErr != nil {
		return esi.ResolvedNames{}, p.resolveErr
	}
	return p.resolved, nil
}

func (p loggingESIProvider) GetCharacters(context.Context, []int64) ([]domain.CharacterIdentity, error) {
	if p.characterErr != nil {
		return nil, p.characterErr
	}
	return p.identities, nil
}

func (loggingESIProvider) GetCorporations(context.Context, []int64) (map[int64]domain.OrganizationMetadata, error) {
	return map[int64]domain.OrganizationMetadata{}, nil
}

func (loggingESIProvider) GetAlliances(context.Context, []int64) (map[int64]domain.OrganizationMetadata, error) {
	return map[int64]domain.OrganizationMetadata{}, nil
}

type loggingZKillProvider struct {
	summaryErr error
}

func (p loggingZKillProvider) FetchSummary(context.Context, int64) (zkill.SummaryRow, error) {
	if p.summaryErr != nil {
		return zkill.SummaryRow{}, p.summaryErr
	}
	return zkill.SummaryRow{}, nil
}

func (loggingZKillProvider) FetchRecentByCharacter(context.Context, int64, int) ([]zkill.Killmail, error) {
	return nil, nil
}

func TestAnalyzeLoggingZeroResolvedEmitsExpectedKeys(t *testing.T) {
	var buf bytes.Buffer
	svc := NewAppServiceWithProviders(loggingESIProvider{
		resolved: esi.ResolvedNames{
			Characters: map[string]int64{},
			Unresolved: []string{"Alice"},
		},
	}, loggingZKillProvider{})
	svc.logger = slog.New(slog.NewJSONHandler(&buf, &slog.HandlerOptions{Level: slog.LevelDebug}))

	if _, err := svc.AnalyzePastedText("Alice"); err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}

	entries := decodeLogEntries(t, &buf)
	parseEntry := findLogEntry(entries, func(e map[string]any) bool { return valueString(e["stage"]) == "parse" })
	if parseEntry == nil || parseEntry["candidate_count"] == nil {
		t.Fatalf("expected parse stage with candidate_count, got %#v", parseEntry)
	}
	resolveEntry := findLogEntry(entries, func(e map[string]any) bool { return valueString(e["stage"]) == "resolve" })
	if resolveEntry == nil || resolveEntry["resolved_identity_count"] == nil || resolveEntry["unresolved_count"] == nil {
		t.Fatalf("expected resolve stage keys, got %#v", resolveEntry)
	}
	finalEntry := findLogEntry(entries, func(e map[string]any) bool { return valueString(e["msg"]) == "analyze completed" })
	if finalEntry == nil || finalEntry["pilot_count"] == nil || finalEntry["analysis_id"] == nil {
		t.Fatalf("expected final analyze keys, got %#v", finalEntry)
	}
}

func TestAnalyzeLoggingPartialResolveIncludesUnresolvedSampleAtDebug(t *testing.T) {
	var buf bytes.Buffer
	svc := NewAppServiceWithProviders(loggingESIProvider{
		resolved: esi.ResolvedNames{
			Characters: map[string]int64{"Alice": 101},
			Unresolved: []string{"Bob", "Carol"},
		},
		identities: []domain.CharacterIdentity{{CharacterID: 101, Name: "Alice"}},
	}, loggingZKillProvider{})
	svc.logger = slog.New(slog.NewJSONHandler(&buf, &slog.HandlerOptions{Level: slog.LevelDebug}))

	if _, err := svc.AnalyzePastedText("Alice\nBob\nCarol"); err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}

	entries := decodeLogEntries(t, &buf)
	sampleEntry := findLogEntry(entries, func(e map[string]any) bool { return valueString(e["msg"]) == "analyze unresolved sample" })
	if sampleEntry == nil {
		t.Fatal("expected unresolved sample debug log entry")
	}
	if !strings.Contains(valueString(sampleEntry["unresolved_sample"]), "Bob") {
		t.Fatalf("expected unresolved sample to include Bob, got %#v", sampleEntry["unresolved_sample"])
	}
}

func TestAnalyzeLoggingProviderFailureUsesErrorPath(t *testing.T) {
	var buf bytes.Buffer
	svc := NewAppServiceWithProviders(loggingESIProvider{
		resolved:   esi.ResolvedNames{Characters: map[string]int64{"Alice": 101}},
		identities: []domain.CharacterIdentity{{CharacterID: 101, Name: "Alice"}},
	}, loggingZKillProvider{summaryErr: errors.New("zk timeout")})
	svc.logger = slog.New(slog.NewJSONHandler(&buf, &slog.HandlerOptions{Level: slog.LevelDebug}))

	if _, err := svc.AnalyzePastedText("Alice"); err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}

	entries := decodeLogEntries(t, &buf)
	errorEntry := findLogEntry(entries, func(e map[string]any) bool {
		return valueString(e["msg"]) == "provider error (degraded mode)" && valueString(e["code"]) == "SUMMARY_FAILED"
	})
	if errorEntry == nil {
		t.Fatal("expected provider error log for SUMMARY_FAILED")
	}
	if valueString(errorEntry["level"]) != "ERROR" {
		t.Fatalf("expected ERROR level for provider failure, got %v", errorEntry["level"])
	}
}

func decodeLogEntries(t *testing.T, buf *bytes.Buffer) []map[string]any {
	t.Helper()
	lines := strings.Split(strings.TrimSpace(buf.String()), "\n")
	out := make([]map[string]any, 0, len(lines))
	for _, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}
		var decoded map[string]any
		if err := json.Unmarshal([]byte(line), &decoded); err != nil {
			t.Fatalf("failed to decode log line %q: %v", line, err)
		}
		out = append(out, decoded)
	}
	return out
}

func findLogEntry(entries []map[string]any, pred func(map[string]any) bool) map[string]any {
	for _, entry := range entries {
		if pred(entry) {
			return entry
		}
	}
	return nil
}

func valueString(v any) string {
	s, _ := v.(string)
	return s
}
