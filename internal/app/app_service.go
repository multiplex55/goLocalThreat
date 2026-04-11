package app

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"golocalthreat/internal/domain"
	"golocalthreat/internal/parser"
	"golocalthreat/internal/providers/esi"
	"golocalthreat/internal/providers/zkill"
	"golocalthreat/internal/scoring"
	"golocalthreat/internal/store"
)

type ZKillProvider interface {
	FetchSummary(ctx context.Context, characterID int64) (zkill.SummaryRow, error)
	FetchRecentByCharacter(ctx context.Context, characterID int64, limit int) ([]zkill.Killmail, error)
}

type noopZKillProvider struct{}

func (noopZKillProvider) FetchSummary(context.Context, int64) (zkill.SummaryRow, error) {
	return zkill.SummaryRow{}, nil
}

func (noopZKillProvider) FetchRecentByCharacter(context.Context, int64, int) ([]zkill.Killmail, error) {
	return nil, nil
}

type AppService struct {
	mu       sync.Mutex
	settings domain.Settings
	sessions map[string]domain.AnalysisSession
	corpMeta map[int64]domain.OrganizationMetadata
	allyMeta map[int64]domain.OrganizationMetadata
	esi      esi.Provider
	zkill    ZKillProvider
	logger   *slog.Logger
	ctx      context.Context
	build    BuildInfo
}

type BuildInfo struct {
	Version string `json:"version"`
	Commit  string `json:"commit"`
	Date    string `json:"date"`
}

func NewAppService() *AppService {
	return NewAppServiceWithProviders(esi.NoopProvider{}, noopZKillProvider{})
}

func NewAppServiceWithProvider(provider esi.Provider) *AppService {
	return NewAppServiceWithProviders(provider, noopZKillProvider{})
}

func NewAppServiceWithProviders(esiProvider esi.Provider, zkillProvider ZKillProvider) *AppService {
	if esiProvider == nil {
		esiProvider = esi.NoopProvider{}
	}
	if zkillProvider == nil {
		zkillProvider = noopZKillProvider{}
	}
	return &AppService{
		settings: domain.Settings{
			RefreshInterval: 30,
			Scoring: domain.ScoringSettings{
				Weights: domain.ScoringWeights{
					Activity:    scoring.DefaultSettings.Weights.Activity,
					Lethality:   scoring.DefaultSettings.Weights.Lethality,
					SoloRisk:    scoring.DefaultSettings.Weights.SoloRisk,
					Recentness:  scoring.DefaultSettings.Weights.Recentness,
					Context:     scoring.DefaultSettings.Weights.Context,
					Uncertainty: scoring.DefaultSettings.Weights.Uncertainty,
				},
				Thresholds: domain.ScoringThresholds{
					Low:      scoring.DefaultSettings.Thresholds.Low,
					Medium:   scoring.DefaultSettings.Thresholds.Medium,
					High:     scoring.DefaultSettings.Thresholds.High,
					Critical: scoring.DefaultSettings.Thresholds.Critical,
				},
			},
		},
		sessions: make(map[string]domain.AnalysisSession),
		corpMeta: make(map[int64]domain.OrganizationMetadata),
		allyMeta: make(map[int64]domain.OrganizationMetadata),
		esi:      esiProvider,
		zkill:    zkillProvider,
		logger:   slog.New(slog.NewJSONHandler(os.Stdout, nil)),
		ctx:      context.Background(),
		build:    BuildInfo{Version: "dev", Commit: "unknown", Date: "unknown"},
	}
}

func (a *AppService) Startup(ctx context.Context) {
	if ctx == nil {
		ctx = context.Background()
	}
	a.mu.Lock()
	a.ctx = ctx
	a.mu.Unlock()
}

func (a *AppService) Shutdown(context.Context) {
	a.mu.Lock()
	a.ctx = nil
	a.mu.Unlock()
}

func (a *AppService) SetBuildInfo(info BuildInfo) {
	a.mu.Lock()
	a.build = info
	a.mu.Unlock()
}

func (a *AppService) GetBuildInfo() BuildInfo {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.build
}

func (a *AppService) AnalyzePastedText(text string) (AnalysisSessionDTO, error) {
	ctx := context.Background()
	now := time.Now().UTC()
	start := now
	analysisID := fmt.Sprintf("analysis-%d", now.UnixNano())
	stageDurations := map[string]int64{}
	warnings := make([]domain.ProviderWarning, 0)
	unresolvedNames := make([]string, 0)

	parseStart := time.Now()
	parsed := parser.NewOrchestrator().Parse(text)
	stageDurations["parse_ms"] = time.Since(parseStart).Milliseconds()
	a.logger.Info("analyze stage complete", "analysis_id", analysisID, "stage", "parse", "duration_ms", stageDurations["parse_ms"], "candidate_count", len(parsed.Candidates), "invalid_count", len(parsed.InvalidLines))

	parserWarnings := make([]domain.ProviderWarning, 0, len(parsed.Warnings))
	for _, warning := range parsed.Warnings {
		parserWarnings = append(parserWarnings, newWarning("parser", warning, warning, warning, nil))
	}
	warnings = append(warnings, parserWarnings...)
	a.logProviderMessages(analysisID, parserWarnings)

	invalidLines := make([]domain.InvalidLine, 0, len(parsed.InvalidLines))
	for _, item := range parsed.InvalidLines {
		invalidLines = append(invalidLines, domain.InvalidLine{Line: item.Line, ReasonCode: item.ReasonCode})
	}

	resolveStart := time.Now()
	identities, unresolved, identityWarnings := a.resolveIdentities(ctx, parsed.Candidates)
	stageDurations["resolve_ms"] = time.Since(resolveStart).Milliseconds()
	warnings = append(warnings, identityWarnings...)
	a.logProviderMessages(analysisID, identityWarnings)
	unresolvedNames = append(unresolvedNames, unresolved...)
	a.logger.Info("analyze stage complete", "analysis_id", analysisID, "stage", "resolve", "duration_ms", stageDurations["resolve_ms"], "resolved_identity_count", len(identities), "unresolved_count", len(unresolved))
	if len(unresolved) > 0 {
		a.logger.Debug("analyze unresolved sample", "analysis_id", analysisID, "unresolved_sample", summarizeNames(unresolved, 5), "unresolved_sample_count", minInt(len(unresolved), 5))
	}

	pilots, enrichWarnings, freshness := a.enrichPilots(ctx, identities, false, 0, analysisID)
	warnings = append(warnings, enrichWarnings...)
	a.logProviderMessages(analysisID, enrichWarnings)
	for k, v := range freshness.StageDurations {
		stageDurations[k] = v
	}

	s := domain.AnalysisSession{
		SessionID: fmt.Sprintf("session-%d", now.UnixNano()),
		CreatedAt: now,
		UpdatedAt: now,
		Source: domain.ParseResult{
			RawText:             text,
			NormalizedText:      parsed.NormalizedText,
			ParsedCharacters:    identities,
			CandidateNames:      parsed.Candidates,
			InvalidLines:        invalidLines,
			Warnings:            parserWarnings,
			InputKind:           string(parsed.InputKind),
			Confidence:          parsed.Confidence,
			RemovedDuplicates:   parsed.RemovedDuplicates,
			SuspiciousArtifacts: parsed.SuspiciousArtifacts,
			ParsedAt:            now,
		},
		Pilots:                 pilots,
		Settings:               a.settings,
		Warnings:               warnings,
		Freshness:              freshness.Freshness,
		DurationMetrics:        stageDurations,
		WarningCount:           len(warnings),
		UnresolvedNames:        unresolvedNames,
		ProviderWarningSummary: summarizeWarnings(warnings),
	}
	stageDurations["total_ms"] = time.Since(start).Milliseconds()
	if err := s.Validate(); err != nil {
		a.logger.Error("analyze failed", "analysis_id", analysisID, "reason", "validation_failed", "error", err)
		return AnalysisSessionDTO{}, err
	}

	a.mu.Lock()
	a.sessions[s.SessionID] = s
	a.mu.Unlock()
	a.logger.Info("analyze completed", "analysis_id", analysisID, "session_id", s.SessionID, "duration_ms", stageDurations["total_ms"], "warning_count", len(warnings), "pilot_count", len(pilots))
	return toAnalysisSessionDTO(s), nil
}

type enrichResult struct {
	Freshness      domain.FetchFreshness
	StageDurations map[string]int64
}

func (a *AppService) resolveIdentities(ctx context.Context, names []string) ([]domain.CharacterIdentity, []string, []domain.ProviderWarning) {
	if len(names) == 0 {
		return nil, nil, nil
	}
	resolved, err := a.esi.ResolveNames(ctx, names)
	warnings := make([]domain.ProviderWarning, 0)
	if err != nil {
		if errors.Is(err, domain.ErrRateLimited) {
			warnings = append(warnings, newWarning("esi", "RATE_LIMITED", "Identity provider is rate-limiting requests; results may be incomplete.", err.Error(), nil))
			return nil, nil, warnings
		}
		warnings = append(warnings, newWarning("esi", "RESOLVE_FAILED", "Identity lookup failed; showing partial results.", err.Error(), nil))
		return nil, nil, warnings
	}
	for _, unresolved := range resolved.Unresolved {
		raw := unresolved
		warnings = append(warnings, newWarning("esi", "UNRESOLVED_NAME", fmt.Sprintf("Could not resolve pilot name '%s'.", unresolved), raw, nil))
	}
	ids := make([]int64, 0, len(resolved.Characters))
	for _, id := range resolved.Characters {
		ids = append(ids, id)
	}
	if len(ids) == 0 {
		return nil, resolved.Unresolved, warnings
	}
	identities, err := a.esi.GetCharacters(ctx, ids)
	if err != nil {
		warnings = append(warnings, newWarning("esi", "IDENTITY_PARTIAL", "Some pilot identity details could not be loaded.", err.Error(), nil))
	}
	byID := make(map[int64]domain.CharacterIdentity, len(identities))
	for _, id := range identities {
		byID[id.CharacterID] = id
	}
	ordered := make([]domain.CharacterIdentity, 0, len(identities))
	seen := map[int64]struct{}{}
	for _, name := range names {
		id, ok := resolved.Characters[name]
		if !ok {
			continue
		}
		if _, dup := seen[id]; dup {
			continue
		}
		if ident, ok := byID[id]; ok {
			ordered = append(ordered, ident)
			seen[id] = struct{}{}
		}
	}
	enriched, orgWarnings := a.enrichOrganizationMetadata(ctx, ordered)
	warnings = append(warnings, orgWarnings...)
	return enriched, resolved.Unresolved, warnings
}

func (a *AppService) enrichOrganizationMetadata(ctx context.Context, identities []domain.CharacterIdentity) ([]domain.CharacterIdentity, []domain.ProviderWarning) {
	warnings := make([]domain.ProviderWarning, 0)
	if len(identities) == 0 {
		return identities, warnings
	}

	missingCorpIDs := make([]int64, 0)
	missingAllianceIDs := make([]int64, 0)
	corpSeen := map[int64]struct{}{}
	allySeen := map[int64]struct{}{}

	a.mu.Lock()
	for _, ident := range identities {
		if ident.CorpID > 0 {
			if _, ok := a.corpMeta[ident.CorpID]; !ok {
				if _, dup := corpSeen[ident.CorpID]; !dup {
					corpSeen[ident.CorpID] = struct{}{}
					missingCorpIDs = append(missingCorpIDs, ident.CorpID)
				}
			}
		}
		if ident.AllianceID > 0 {
			if _, ok := a.allyMeta[ident.AllianceID]; !ok {
				if _, dup := allySeen[ident.AllianceID]; !dup {
					allySeen[ident.AllianceID] = struct{}{}
					missingAllianceIDs = append(missingAllianceIDs, ident.AllianceID)
				}
			}
		}
	}
	a.mu.Unlock()

	if len(missingCorpIDs) > 0 {
		corps, err := a.esi.GetCorporations(ctx, missingCorpIDs)
		if err != nil {
			warnings = append(warnings, newWarning("esi", "CORP_METADATA_PARTIAL", "Some corporation details could not be loaded.", err.Error(), nil))
		}
		a.mu.Lock()
		for id, meta := range corps {
			a.corpMeta[id] = meta
		}
		a.mu.Unlock()
	}

	if len(missingAllianceIDs) > 0 {
		alliances, err := a.esi.GetAlliances(ctx, missingAllianceIDs)
		if err != nil {
			warnings = append(warnings, newWarning("esi", "ALLIANCE_METADATA_PARTIAL", "Some alliance details could not be loaded.", err.Error(), nil))
		}
		a.mu.Lock()
		for id, meta := range alliances {
			a.allyMeta[id] = meta
		}
		a.mu.Unlock()
	}

	a.mu.Lock()
	defer a.mu.Unlock()
	out := make([]domain.CharacterIdentity, len(identities))
	for i, ident := range identities {
		out[i] = ident
		if corpMeta, ok := a.corpMeta[ident.CorpID]; ok {
			out[i].CorpName = corpMeta.Name
			out[i].CorpTicker = corpMeta.Ticker
		}
		if allianceMeta, ok := a.allyMeta[ident.AllianceID]; ok {
			out[i].AllianceName = allianceMeta.Name
			out[i].AllianceTicker = allianceMeta.Ticker
		}
	}
	return out, warnings
}

func (a *AppService) enrichPilots(ctx context.Context, identities []domain.CharacterIdentity, explicitRefresh bool, selectedPilotID int64, analysisID string) ([]domain.PilotThreatRecord, []domain.ProviderWarning, enrichResult) {
	warnings := make([]domain.ProviderWarning, 0)
	stageDurations := map[string]int64{}
	now := time.Now().UTC()
	pilots := make([]domain.PilotThreatRecord, len(identities))
	for i, ident := range identities {
		pilots[i] = domain.PilotThreatRecord{
			Identity:    ident,
			Threat:      zkill.SummaryRow{}.ToThreatBreakdown(),
			LastUpdated: now,
			Freshness:   domain.FetchFreshness{Source: "zkill", DataAsOf: now, IsStale: true},
		}
	}
	statsStart := time.Now()
	summaries, statWarnings := a.fetchSummaryRows(ctx, identities)
	warnings = append(warnings, statWarnings...)
	for i := range pilots {
		row := summaries[pilots[i].Identity.CharacterID]
		mergedThreat, mergedFreshness, _ := mergePilotThreat(row, detailThreatEvidence{}, a.settings.RefreshInterval, now)
		pilots[i].Threat = mergedThreat
		pilots[i].Freshness = mergedFreshness
	}
	stageDurations["zkill_stats_ms"] = time.Since(statsStart).Milliseconds()
	a.logger.Info("analyze stage complete", "analysis_id", analysisID, "stage", "zkill_stats", "duration_ms", stageDurations["zkill_stats_ms"], "record_count", len(summaries), "warning_count", len(statWarnings))

	detailsStart := time.Now()
	targetIDs := SelectDetailFetchTargets(pilots, 3, selectedPilotID, explicitRefresh)
	detailEvidence, detailWarnings := a.fetchDetails(ctx, pilots, targetIDs)
	warnings = append(warnings, detailWarnings...)
	for idx := range pilots {
		charID := pilots[idx].Identity.CharacterID
		summary := summaries[charID]
		evidence := detailEvidence[charID]
		mergedThreat, mergedFreshness, _ := mergePilotThreat(summary, evidence, a.settings.RefreshInterval, now)
		pilots[idx].Threat = mergedThreat
		if evidence.Killmails > 0 && !evidence.HasRecency {
			// Recency degrades only for time-derived fields; preserve baseline summary freshness.
			continue
		}
		pilots[idx].Freshness = mergedFreshness
	}
	stageDurations["zkill_detail_ms"] = time.Since(detailsStart).Milliseconds()
	a.logger.Info("analyze stage complete", "analysis_id", analysisID, "stage", "zkill_detail", "duration_ms", stageDurations["zkill_detail_ms"], "target_count", len(targetIDs), "warning_count", len(detailWarnings))

	freshness := domain.FetchFreshness{Source: "composite", DataAsOf: now, IsStale: false}
	for _, p := range pilots {
		if p.Freshness.IsStale {
			freshness.IsStale = true
		}
		if p.Freshness.DataAsOf.IsZero() {
			continue
		}
		if p.Freshness.DataAsOf.Before(freshness.DataAsOf) {
			freshness.DataAsOf = p.Freshness.DataAsOf
		}
	}
	return pilots, warnings, enrichResult{Freshness: freshness, StageDurations: stageDurations}
}

func (a *AppService) fetchSummaryRows(ctx context.Context, identities []domain.CharacterIdentity) (map[int64]zkill.SummaryRow, []domain.ProviderWarning) {
	warnings := make([]domain.ProviderWarning, 0)
	summaries := make(map[int64]zkill.SummaryRow, len(identities))
	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, 6)
	for _, ident := range identities {
		ident := ident
		wg.Add(1)
		go func() {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			row, err := a.zkill.FetchSummary(ctx, ident.CharacterID)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				warnings = append(warnings, newWarning(
					"zkill",
					"SUMMARY_FAILED",
					fmt.Sprintf("Could not load summary stats for %s.", ident.Name),
					fmt.Sprintf("%s (%d): %v", ident.Name, ident.CharacterID, err),
					&ident,
				))
				return
			}
			summaries[ident.CharacterID] = row
		}()
	}
	wg.Wait()
	return summaries, warnings
}

func (a *AppService) fetchDetails(ctx context.Context, pilots []domain.PilotThreatRecord, targetIDs []int64) (map[int64]detailThreatEvidence, []domain.ProviderWarning) {
	warnings := make([]domain.ProviderWarning, 0)
	evidenceByID := make(map[int64]detailThreatEvidence, len(targetIDs))
	byID := make(map[int64]int, len(pilots))
	for i, p := range pilots {
		byID[p.Identity.CharacterID] = i
	}
	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, 4)
	for _, id := range targetIDs {
		idx, ok := byID[id]
		if !ok {
			continue
		}
		id := id
		wg.Add(1)
		go func() {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			kms, err := a.zkill.FetchRecentByCharacter(ctx, id, 25)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				ident := pilots[idx].Identity
				warnings = append(warnings, newWarning(
					"zkill",
					"DETAIL_FAILED",
					fmt.Sprintf("Could not load detailed killmail timestamps for %s.", ident.Name),
					fmt.Sprintf("%s (%d): %v", ident.Name, ident.CharacterID, err),
					&ident,
				))
				return
			}
			if len(kms) == 0 {
				return
			}
			evidence := deriveDetailThreatEvidence(id, kms)
			evidenceByID[id] = evidence
			if evidence.InvalidOccurredAt > 0 {
				ident := pilots[idx].Identity
				warnings = append(warnings, domain.ProviderWarning{
					Provider:      "zkill",
					Code:          "DETAIL_TIME_INVALID",
					Message:       warningMessageForCode("DETAIL_TIME_INVALID", ""),
					CharacterID:   int64Ptr(ident.CharacterID),
					CharacterName: ident.Name,
					Severity:      severityForWarningCode("DETAIL_TIME_INVALID"),
					UserVisible:   userVisibleForWarningCode("DETAIL_TIME_INVALID"),
					Category:      categoryForWarningCode("DETAIL_TIME_INVALID"),
					Metadata: map[string]string{
						"coalesceKey":          "zkill:detail_time_invalid",
						"timestampFailures":    fmt.Sprintf("%d", evidence.InvalidOccurredAt),
						"timestampMissing":     fmt.Sprintf("%d", evidence.MissingOccurredAt),
						"timestampUnparseable": fmt.Sprintf("%d", evidence.InvalidOccurredAt-evidence.MissingOccurredAt),
					},
				})
			}
			if evidence.ValidOccurredAt == 0 {
				ident := pilots[idx].Identity
				warnings = append(warnings, domain.ProviderWarning{
					Provider:      "zkill",
					Code:          "DETAIL_TIME_MISSING",
					Message:       warningMessageForCode("DETAIL_TIME_MISSING", ""),
					CharacterID:   int64Ptr(ident.CharacterID),
					CharacterName: ident.Name,
					Severity:      severityForWarningCode("DETAIL_TIME_MISSING"),
					UserVisible:   userVisibleForWarningCode("DETAIL_TIME_MISSING"),
					Category:      categoryForWarningCode("DETAIL_TIME_MISSING"),
					Metadata: map[string]string{
						"coalesceKey":       "zkill:detail_time_missing",
						"timestampFailures": fmt.Sprintf("%d", evidence.InvalidOccurredAt),
					},
				})
			}
		}()
	}
	wg.Wait()
	return evidenceByID, warnings
}

func isStale(dataAsOf time.Time, refreshIntervalMin int) bool {
	if refreshIntervalMin <= 0 {
		refreshIntervalMin = 30
	}
	return time.Since(dataAsOf) > time.Duration(refreshIntervalMin)*time.Minute
}

func summarizeWarnings(warnings []domain.ProviderWarning) []domain.ProviderWarningSummary {
	grouped := map[string]int{}
	for _, w := range warnings {
		grouped[w.Provider]++
	}
	keys := make([]string, 0, len(grouped))
	for k := range grouped {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	out := make([]domain.ProviderWarningSummary, 0, len(keys))
	for _, k := range keys {
		out = append(out, domain.ProviderWarningSummary{Provider: k, Count: grouped[k]})
	}
	return out
}

func (a *AppService) logProviderMessages(analysisID string, warnings []domain.ProviderWarning) {
	for _, warning := range warnings {
		level := slog.LevelWarn
		msg := "provider warning"
		if warning.Code == "RESOLVE_FAILED" || warning.Code == "SUMMARY_FAILED" || warning.Code == "DETAIL_FAILED" {
			level = slog.LevelError
			msg = "provider error (degraded mode)"
		}
		a.logger.Log(context.Background(), level, msg, "analysis_id", analysisID, "provider", warning.Provider, "code", warning.Code)
		if level == slog.LevelWarn {
			a.logger.Debug("provider warning detail", "analysis_id", analysisID, "provider", warning.Provider, "code", warning.Code, "message", warning.Message)
		}
	}
}

func newWarning(provider string, code string, summary string, rawMessage string, ident *domain.CharacterIdentity) domain.ProviderWarning {
	warning := domain.ProviderWarning{
		Provider:    provider,
		Code:        code,
		Message:     warningMessageForCode(code, summary),
		Severity:    severityForWarningCode(code),
		UserVisible: userVisibleForWarningCode(code),
		Category:    categoryForWarningCode(code),
	}
	if rawMessage != "" && warning.Message == summary {
		warning.Message = fmt.Sprintf("%s (raw: %s)", summary, rawMessage)
	}
	if ident != nil {
		warning.CharacterID = int64Ptr(ident.CharacterID)
		warning.CharacterName = ident.Name
	}
	return warning
}

func int64Ptr(v int64) *int64 {
	return &v
}

func severityForWarningCode(code string) string {
	switch code {
	case "RESOLVE_FAILED", "SUMMARY_FAILED", "DETAIL_FAILED":
		return "error"
	case "RATE_LIMITED", "IDENTITY_PARTIAL", "UNRESOLVED_NAME", "DETAIL_TIME_MISSING":
		return "warn"
	default:
		return "info"
	}
}

func warningMessageForCode(code string, fallback string) string {
	switch code {
	case "DETAIL_TIME_INVALID":
		return "Partial zKill timestamps"
	case "DETAIL_TIME_MISSING":
		return "Recent activity has partial timestamps"
	default:
		return fallback
	}
}

func categoryForWarningCode(code string) string {
	switch code {
	case "RATE_LIMITED":
		return "provider"
	case "DETAIL_TIME_INVALID", "DETAIL_TIME_MISSING", "UNRESOLVED_NAME", "IDENTITY_PARTIAL":
		return "data_quality"
	case "RESOLVE_FAILED", "SUMMARY_FAILED", "DETAIL_FAILED":
		return "transport"
	default:
		return "provider"
	}
}

func userVisibleForWarningCode(code string) bool {
	switch code {
	case "DETAIL_TIME_INVALID":
		return false
	default:
		return true
	}
}

func summarizeNames(names []string, limit int) string {
	if len(names) == 0 || limit <= 0 {
		return ""
	}
	if len(names) > limit {
		names = names[:limit]
	}
	return strings.Join(names, ",")
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func (a *AppService) RefreshSession(sessionID string) (AnalysisSessionDTO, error) {
	a.mu.Lock()
	s, ok := a.sessions[sessionID]
	a.mu.Unlock()
	if !ok {
		return AnalysisSessionDTO{}, fmt.Errorf("session %s not found", sessionID)
	}
	pilots, warnings, freshness := a.enrichPilots(context.Background(), s.Source.ParsedCharacters, true, 0, "")
	s.Pilots = pilots
	s.Warnings = append(s.Source.Warnings, warnings...)
	s.WarningCount = len(s.Warnings)
	s.ProviderWarningSummary = summarizeWarnings(s.Warnings)
	s.Freshness = freshness.Freshness
	for k, v := range freshness.StageDurations {
		s.DurationMetrics[k] = v
	}
	s.UpdatedAt = time.Now().UTC()
	a.mu.Lock()
	a.sessions[sessionID] = s
	a.mu.Unlock()
	return toAnalysisSessionDTO(s), nil
}

func (a *AppService) RefreshPilot(sessionID string, characterID int64) (PilotThreatRecordDTO, error) {
	a.mu.Lock()
	s, ok := a.sessions[sessionID]
	a.mu.Unlock()
	if !ok {
		return PilotThreatRecordDTO{}, fmt.Errorf("session %s not found", sessionID)
	}
	found := false
	for _, p := range s.Pilots {
		if p.Identity.CharacterID == characterID {
			found = true
			break
		}
	}
	if !found {
		return PilotThreatRecordDTO{}, fmt.Errorf("pilot %d not found in session %s", characterID, sessionID)
	}
	pilots, warnings, _ := a.enrichPilots(context.Background(), s.Source.ParsedCharacters, false, characterID, "")
	s.Pilots = pilots
	s.Warnings = append(s.Source.Warnings, warnings...)
	s.WarningCount = len(s.Warnings)
	s.ProviderWarningSummary = summarizeWarnings(s.Warnings)
	s.UpdatedAt = time.Now().UTC()
	a.mu.Lock()
	a.sessions[sessionID] = s
	a.mu.Unlock()
	for _, p := range pilots {
		if p.Identity.CharacterID == characterID {
			return toPilotDTO(p, nil), nil
		}
	}
	return PilotThreatRecordDTO{}, fmt.Errorf("pilot %d not found in session %s", characterID, sessionID)
}

func (a *AppService) LoadRecentSessions(limit int) ([]AnalysisSessionDTO, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if limit <= 0 {
		limit = 10
	}
	out := make([]AnalysisSessionDTO, 0, len(a.sessions))
	for _, s := range a.sessions {
		out = append(out, toAnalysisSessionDTO(s))
		if len(out) == limit {
			break
		}
	}
	return out, nil
}

func (a *AppService) LoadSettings() (domain.Settings, error) {
	return a.settings, nil
}

func (a *AppService) SaveSettings(settings domain.Settings) (domain.Settings, error) {
	if err := store.ValidateSettings(settings); err != nil {
		return domain.Settings{}, err
	}
	a.mu.Lock()
	a.settings = settings
	a.mu.Unlock()
	return a.settings, nil
}

func (a *AppService) PinPilot(characterID int64) (domain.Settings, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.settings.PinnedPilots = append(a.settings.PinnedPilots, characterID)
	return a.settings, nil
}

func (a *AppService) IgnoreCorp(corpID int64) (domain.Settings, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.settings.IgnoredCorps = append(a.settings.IgnoredCorps, corpID)
	return a.settings, nil
}

func (a *AppService) IgnoreAlliance(allianceID int64) (domain.Settings, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.settings.IgnoredAlliances = append(a.settings.IgnoredAlliances, allianceID)
	return a.settings, nil
}

func (a *AppService) ClearCache() (bool, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.sessions = make(map[string]domain.AnalysisSession)
	return true, nil
}
