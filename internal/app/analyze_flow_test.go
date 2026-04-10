package app_test

import (
	"context"
	"errors"
	"reflect"
	"testing"
	"time"

	"golocalthreat/internal/app"
	"golocalthreat/internal/domain"
	"golocalthreat/internal/providers/esi"
	"golocalthreat/internal/providers/zkill"
)

type mockESIProvider struct {
	resolved esi.ResolvedNames
	idents   []domain.CharacterIdentity
	err      error
}

func (m mockESIProvider) ResolveNames(context.Context, []string) (esi.ResolvedNames, error) {
	if m.err != nil {
		return esi.ResolvedNames{}, m.err
	}
	return m.resolved, nil
}
func (m mockESIProvider) GetCharacters(context.Context, []int64) ([]domain.CharacterIdentity, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.idents, nil
}
func (m mockESIProvider) GetCorporations(context.Context, []int64) (map[int64]string, error) {
	return map[int64]string{}, nil
}
func (m mockESIProvider) GetAlliances(context.Context, []int64) (map[int64]string, error) {
	return map[int64]string{}, nil
}

type mockZKillProvider struct {
	summaries  map[int64]zkill.SummaryRow
	summaryErr map[int64]error
	details    map[int64][]zkill.Killmail
	detailErr  map[int64]error
}

func (m mockZKillProvider) FetchSummary(_ context.Context, characterID int64) (zkill.SummaryRow, error) {
	if err, ok := m.summaryErr[characterID]; ok {
		return zkill.SummaryRow{}, err
	}
	return m.summaries[characterID], nil
}
func (m mockZKillProvider) FetchRecentByCharacter(_ context.Context, characterID int64, _ int) ([]zkill.Killmail, error) {
	if err, ok := m.detailErr[characterID]; ok {
		return nil, err
	}
	return m.details[characterID], nil
}

func TestAnalyzeFlowHappyPathFullFlow(t *testing.T) {
	now := time.Now().UTC()
	esiProvider := mockESIProvider{
		resolved: esi.ResolvedNames{Characters: map[string]int64{"Alice": 101, "Bob": 202}},
		idents:   []domain.CharacterIdentity{{CharacterID: 101, Name: "Alice"}, {CharacterID: 202, Name: "Bob"}},
	}
	zkProvider := mockZKillProvider{summaries: map[int64]zkill.SummaryRow{
		101: {CharacterID: 101, RecentKills: 5, RecentLosses: 1, DangerRatio: 0.8, LastActivity: now},
		202: {CharacterID: 202, RecentKills: 1, RecentLosses: 3, DangerRatio: 0.2, LastActivity: now.Add(-2 * time.Hour)},
	}, details: map[int64][]zkill.Killmail{101: {{KillID: 1, OccurredAt: now}}}}

	svc := app.NewAppServiceWithProviders(esiProvider, zkProvider)
	session, err := svc.AnalyzePastedText("Alice\nBob\nAlice")
	if err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}
	if len(session.Pilots) != 2 {
		t.Fatalf("expected two pilots, got %d", len(session.Pilots))
	}
	if session.Pilots[0].Identity.Name != "Alice" || session.Pilots[1].Identity.Name != "Bob" {
		t.Fatalf("pilot order should follow first-seen order: %#v", session.Pilots)
	}
	if session.WarningCount != len(session.Warnings) {
		t.Fatalf("warning count mismatch: %d vs %d", session.WarningCount, len(session.Warnings))
	}
	if len(session.DurationMetrics) == 0 {
		t.Fatal("expected duration metrics")
	}
}

func TestAnalyzeFlowEmptyInput(t *testing.T) {
	svc := app.NewAppServiceWithProviders(mockESIProvider{}, mockZKillProvider{})
	session, err := svc.AnalyzePastedText("")
	if err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}
	if len(session.Source.CandidateNames) != 0 {
		t.Fatalf("expected no candidates, got %v", session.Source.CandidateNames)
	}
	found := false
	for _, w := range session.Warnings {
		if w.Provider == "parser" && w.Code == "empty_input" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected empty_input warning, got %#v", session.Warnings)
	}
}

func TestAnalyzeFlowMalformedMixedInput(t *testing.T) {
	esiProvider := mockESIProvider{
		resolved: esi.ResolvedNames{Characters: map[string]int64{"Alice": 101}},
		idents:   []domain.CharacterIdentity{{CharacterID: 101, Name: "Alice"}},
	}
	svc := app.NewAppServiceWithProviders(esiProvider, mockZKillProvider{})
	session, err := svc.AnalyzePastedText("Alice\n$$$\n<bad>")
	if err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}
	if len(session.Source.InvalidLines) == 0 {
		t.Fatalf("expected malformed lines to be captured")
	}
	if len(session.Pilots) != 1 || session.Pilots[0].Identity.Name != "Alice" {
		t.Fatalf("expected resolved Alice only, got %#v", session.Pilots)
	}
}

func TestAnalyzeFlowPartialProviderFailureFallback(t *testing.T) {
	esiProvider := mockESIProvider{
		resolved: esi.ResolvedNames{Characters: map[string]int64{"Alice": 101, "Bob": 202}},
		idents:   []domain.CharacterIdentity{{CharacterID: 101, Name: "Alice"}, {CharacterID: 202, Name: "Bob"}},
	}
	zkProvider := mockZKillProvider{
		summaries:  map[int64]zkill.SummaryRow{101: {CharacterID: 101, RecentKills: 3, RecentLosses: 1}},
		summaryErr: map[int64]error{202: errors.New("upstream timeout")},
	}
	svc := app.NewAppServiceWithProviders(esiProvider, zkProvider)
	session, err := svc.AnalyzePastedText("Alice\nBob")
	if err != nil {
		t.Fatalf("AnalyzePastedText should degrade gracefully, got err: %v", err)
	}
	if len(session.Pilots) != 2 {
		t.Fatalf("expected usable partial session with 2 pilots, got %d", len(session.Pilots))
	}
	if session.WarningCount == 0 {
		t.Fatalf("expected warning for failed provider")
	}
}

func TestAnalyzeFlowStaleCacheRefreshBehavior(t *testing.T) {
	old := time.Now().UTC().Add(-2 * time.Hour)
	esiProvider := mockESIProvider{
		resolved: esi.ResolvedNames{Characters: map[string]int64{"Alice": 101}},
		idents:   []domain.CharacterIdentity{{CharacterID: 101, Name: "Alice"}},
	}
	zkProvider := mockZKillProvider{
		summaries: map[int64]zkill.SummaryRow{101: {CharacterID: 101, RecentKills: 1, RecentLosses: 0, LastActivity: old}},
		details:   map[int64][]zkill.Killmail{101: {{KillID: 99, OccurredAt: time.Now().UTC()}}},
	}
	svc := app.NewAppServiceWithProviders(esiProvider, zkProvider)
	session, err := svc.AnalyzePastedText("Alice")
	if err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}
	refreshed, err := svc.RefreshSession(session.SessionID)
	if err != nil {
		t.Fatalf("RefreshSession err: %v", err)
	}
	if !refreshed.UpdatedAt.After(session.UpdatedAt) {
		t.Fatalf("expected session updated time to move forward")
	}
	pilot, err := svc.RefreshPilot(session.SessionID, 101)
	if err != nil {
		t.Fatalf("RefreshPilot err: %v", err)
	}
	if pilot.Identity.CharacterID != 101 {
		t.Fatalf("unexpected pilot refresh result: %#v", pilot)
	}
	if reflect.DeepEqual(session.Pilots[0], pilot) {
		t.Fatalf("expected pilot to be re-enriched on refresh")
	}
}

func TestAnalyzeFlowDetailZeroOccurredAtKeepsSummaryFreshness(t *testing.T) {
	lastActivity := time.Now().UTC().Add(-45 * time.Minute).Truncate(time.Second)
	esiProvider := mockESIProvider{
		resolved: esi.ResolvedNames{Characters: map[string]int64{"Alice": 101}},
		idents:   []domain.CharacterIdentity{{CharacterID: 101, Name: "Alice"}},
	}
	zkProvider := mockZKillProvider{
		summaries: map[int64]zkill.SummaryRow{
			101: {CharacterID: 101, RecentKills: 4, RecentLosses: 2, LastActivity: lastActivity},
		},
		details: map[int64][]zkill.Killmail{
			101: {{KillID: 1}, {KillID: 2}},
		},
	}
	svc := app.NewAppServiceWithProviders(esiProvider, zkProvider)
	session, err := svc.AnalyzePastedText("Alice")
	if err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}
	got := session.Pilots[0].Freshness.DataAsOf
	if got.IsZero() {
		t.Fatalf("pilot freshness should remain non-zero")
	}
	if !got.Equal(lastActivity) {
		t.Fatalf("expected summary freshness %s, got %s", lastActivity, got)
	}
	foundWarning := false
	for _, w := range session.Warnings {
		if w.Provider == "zkill" && w.Code == "DETAIL_TIME_MISSING" {
			foundWarning = true
		}
	}
	if !foundWarning {
		t.Fatalf("expected DETAIL_TIME_MISSING warning, got %#v", session.Warnings)
	}
}

func TestAnalyzeFlowDetailMixedOccurredAtUsesValidLatest(t *testing.T) {
	lastActivity := time.Now().UTC().Add(-2 * time.Hour)
	validLatest := time.Now().UTC().Add(-10 * time.Minute).Truncate(time.Second)
	esiProvider := mockESIProvider{
		resolved: esi.ResolvedNames{Characters: map[string]int64{"Alice": 101}},
		idents:   []domain.CharacterIdentity{{CharacterID: 101, Name: "Alice"}},
	}
	zkProvider := mockZKillProvider{
		summaries: map[int64]zkill.SummaryRow{
			101: {CharacterID: 101, RecentKills: 2, RecentLosses: 1, LastActivity: lastActivity},
		},
		details: map[int64][]zkill.Killmail{
			101: {
				{KillID: 1},
				{KillID: 2, OccurredAt: validLatest},
				{KillID: 3, OccurredAt: validLatest.Add(-15 * time.Minute)},
			},
		},
	}
	svc := app.NewAppServiceWithProviders(esiProvider, zkProvider)
	session, err := svc.AnalyzePastedText("Alice")
	if err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}
	got := session.Pilots[0].Freshness.DataAsOf
	if !got.Equal(validLatest) {
		t.Fatalf("expected valid detail latest %s, got %s", validLatest, got)
	}
}

func TestAnalyzeFlowDetailInvalidTimestampsPreservesSummaryFreshness(t *testing.T) {
	lastActivity := time.Now().UTC().Add(-90 * time.Minute).Truncate(time.Second)
	esiProvider := mockESIProvider{
		resolved: esi.ResolvedNames{Characters: map[string]int64{"Alice": 101}},
		idents:   []domain.CharacterIdentity{{CharacterID: 101, Name: "Alice"}},
	}
	zkProvider := mockZKillProvider{
		summaries: map[int64]zkill.SummaryRow{
			101: {CharacterID: 101, RecentKills: 3, RecentLosses: 1, LastActivity: lastActivity},
		},
		details: map[int64][]zkill.Killmail{
			101: {{KillID: 10}, {KillID: 11}},
		},
	}
	svc := app.NewAppServiceWithProviders(esiProvider, zkProvider)
	session, err := svc.AnalyzePastedText("Alice")
	if err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}
	if got := session.Pilots[0].Freshness.DataAsOf; !got.Equal(lastActivity) {
		t.Fatalf("expected summary freshness %s to persist, got %s", lastActivity, got)
	}
}

func TestAnalyzeFlowDetailInvalidTimestampWarningDoesNotBreakAnalysis(t *testing.T) {
	lastActivity := time.Now().UTC().Add(-70 * time.Minute).Truncate(time.Second)
	validLatest := time.Now().UTC().Add(-5 * time.Minute).Truncate(time.Second)
	esiProvider := mockESIProvider{
		resolved: esi.ResolvedNames{Characters: map[string]int64{"Alice": 101}},
		idents:   []domain.CharacterIdentity{{CharacterID: 101, Name: "Alice"}},
	}
	zkProvider := mockZKillProvider{
		summaries: map[int64]zkill.SummaryRow{
			101: {CharacterID: 101, RecentKills: 6, RecentLosses: 2, LastActivity: lastActivity},
		},
		details: map[int64][]zkill.Killmail{
			101: {
				{KillID: 1, OccurredAt: validLatest},
				{KillID: 2, OccurredAtInvalid: true},
			},
		},
	}
	svc := app.NewAppServiceWithProviders(esiProvider, zkProvider)
	session, err := svc.AnalyzePastedText("Alice")
	if err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}
	if len(session.Pilots) != 1 {
		t.Fatalf("expected one pilot, got %d", len(session.Pilots))
	}
	if got := session.Pilots[0].Freshness.DataAsOf; !got.Equal(validLatest) {
		t.Fatalf("expected detail freshness %s, got %s", validLatest, got)
	}
	foundInvalidWarning := false
	for _, w := range session.Warnings {
		if w.Provider == "zkill" && w.Code == "DETAIL_TIME_INVALID" {
			foundInvalidWarning = true
		}
	}
	if !foundInvalidWarning {
		t.Fatalf("expected DETAIL_TIME_INVALID warning, got %#v", session.Warnings)
	}
}
