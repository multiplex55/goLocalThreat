import * as AppService from '../../../wailsjs/go/app/AppService';
import type { SettingsViewModel } from '../../features/settings/types';
import type { AnalysisSessionView, ParseWarningView, PilotThreatView, ThreatBand } from '../../types/analysis';
import { resolveWarningPresentation } from './warningRouting';

function toThreatBand(band: string | undefined): ThreatBand {
  if (band === 'critical' || band === 'high' || band === 'medium' || band === 'low') return band;
  return 'unknown';
}

function nullableText(value: string | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function normalizeTimestampOrNull(value: string | undefined): string | null {
  const normalized = nullableText(value);
  if (!normalized) return null;
  if (normalized === '0001-01-01T00:00:00Z') return null;
  if (normalized.startsWith('0001-01-01')) return null;
  return normalized;
}

type ValueState = 'present' | 'missing' | 'not_fetched';
type SourcePriority = 'detail' | 'summary';

type MetricDefinition<TValue> = {
  source: {
    detail: (pilot: AppService.PilotThreatDTO) => TValue | undefined;
    summary: (pilot: AppService.PilotThreatDTO) => TValue | undefined;
  };
  transform: (value: TValue | undefined) => TValue | null | undefined;
  fallbackOrder: SourcePriority[];
  allowSummaryFallbackWhenDetailMissing: boolean;
  shouldAccept: (value: TValue | null | undefined) => boolean;
};

type MetricResolution<TValue> = {
  value: TValue | null | undefined;
  state: ValueState;
  sourceUsed: SourcePriority | null;
};

const isNumeric = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value);
const isNonEmptyText = (value: string | null | undefined): value is string => typeof value === 'string' && value.trim().length > 0;
const passthrough = <T>(value: T | undefined): T | undefined => value;

const metricDefinitions = {
  kills: {
    source: { detail: (pilot) => pilot.threat?.recentKills, summary: (pilot) => pilot.kills },
    transform: passthrough<number>,
    fallbackOrder: ['detail', 'summary'],
    allowSummaryFallbackWhenDetailMissing: true,
    shouldAccept: isNumeric,
  },
  losses: {
    source: { detail: (pilot) => pilot.threat?.recentLosses, summary: (pilot) => pilot.losses },
    transform: passthrough<number>,
    fallbackOrder: ['detail', 'summary'],
    allowSummaryFallbackWhenDetailMissing: true,
    shouldAccept: isNumeric,
  },
  dangerPercent: {
    source: { detail: (pilot) => pilot.threat?.dangerPercent, summary: (pilot) => pilot.dangerPercent },
    transform: passthrough<number>,
    fallbackOrder: ['detail', 'summary'],
    allowSummaryFallbackWhenDetailMissing: true,
    shouldAccept: isNumeric,
  },
  soloPercent: {
    source: { detail: (pilot) => pilot.threat?.soloPercent, summary: (pilot) => pilot.soloPercent },
    transform: passthrough<number>,
    fallbackOrder: ['detail', 'summary'],
    allowSummaryFallbackWhenDetailMissing: true,
    shouldAccept: isNumeric,
  },
  avgGangSize: {
    source: { detail: (pilot) => pilot.threat?.avgGangSize, summary: (pilot) => pilot.avgGangSize },
    transform: passthrough<number>,
    fallbackOrder: ['detail', 'summary'],
    allowSummaryFallbackWhenDetailMissing: true,
    shouldAccept: isNumeric,
  },
  mainShip: {
    source: { detail: (pilot) => pilot.threat?.mainShip, summary: (pilot) => pilot.mainShip },
    transform: nullableText,
    fallbackOrder: ['detail', 'summary'],
    allowSummaryFallbackWhenDetailMissing: true,
    shouldAccept: isNonEmptyText,
  },
  lastKill: {
    source: { detail: (pilot) => pilot.threat?.lastKill, summary: (pilot) => pilot.lastKill },
    transform: normalizeTimestampOrNull,
    fallbackOrder: ['detail', 'summary'],
    allowSummaryFallbackWhenDetailMissing: true,
    shouldAccept: isNonEmptyText,
  },
  lastLoss: {
    source: { detail: (pilot) => pilot.threat?.lastLoss, summary: (pilot) => pilot.lastLoss },
    transform: normalizeTimestampOrNull,
    fallbackOrder: ['detail', 'summary'],
    allowSummaryFallbackWhenDetailMissing: true,
    shouldAccept: isNonEmptyText,
  },
} satisfies Record<'kills' | 'losses' | 'dangerPercent' | 'soloPercent' | 'avgGangSize' | 'mainShip' | 'lastKill' | 'lastLoss', MetricDefinition<number | string>>;

function resolveMetric<TValue>(pilot: AppService.PilotThreatDTO, definition: MetricDefinition<TValue>): MetricResolution<TValue> {
  const detailValue = definition.transform(definition.source.detail(pilot));
  const summaryValue = definition.transform(definition.source.summary(pilot));

  for (const source of definition.fallbackOrder) {
    const candidate = source === 'detail' ? detailValue : summaryValue;
    if (definition.shouldAccept(candidate)) {
      return { value: candidate, state: 'present', sourceUsed: source };
    }
  }

  // Null means explicitly known-empty; undefined means intentionally not-fetched.
  if (detailValue === null || summaryValue === null) {
    if (definition.allowSummaryFallbackWhenDetailMissing && definition.shouldAccept(summaryValue)) {
      return { value: summaryValue, state: 'present', sourceUsed: 'summary' };
    }
    return { value: null, state: 'missing', sourceUsed: null };
  }

  if (definition.allowSummaryFallbackWhenDetailMissing && definition.shouldAccept(summaryValue)) {
    return { value: summaryValue, state: 'present', sourceUsed: 'summary' };
  }

  return { value: undefined, state: 'not_fetched', sourceUsed: null };
}

function resolvePilotMetrics(pilot: AppService.PilotThreatDTO) {
  const metrics = {
    kills: resolveMetric(pilot, metricDefinitions.kills),
    losses: resolveMetric(pilot, metricDefinitions.losses),
    dangerPercent: resolveMetric(pilot, metricDefinitions.dangerPercent),
    soloPercent: resolveMetric(pilot, metricDefinitions.soloPercent),
    avgGangSize: resolveMetric(pilot, metricDefinitions.avgGangSize),
    mainShip: resolveMetric(pilot, metricDefinitions.mainShip),
    lastKill: resolveMetric(pilot, metricDefinitions.lastKill),
    lastLoss: resolveMetric(pilot, metricDefinitions.lastLoss),
  };


  const detailMainShip = nullableText(pilot.threat?.mainShip);
  const detailLastKill = normalizeTimestampOrNull(pilot.threat?.lastKill);
  const detailLastLoss = normalizeTimestampOrNull(pilot.threat?.lastLoss);
  const detailNumericValues = [
    pilot.threat?.recentKills,
    pilot.threat?.recentLosses,
    pilot.threat?.dangerPercent,
    pilot.threat?.soloPercent,
    pilot.threat?.avgGangSize,
  ];
  const detailLooksDefaulted = detailNumericValues.every((value) => value === undefined || value === 0)
    && !detailMainShip
    && !detailLastKill
    && !detailLastLoss;

  if (detailLooksDefaulted) {
    (['kills', 'losses', 'dangerPercent', 'soloPercent', 'avgGangSize'] as const).forEach((key) => {
      const summaryCandidate = metricDefinitions[key].transform(metricDefinitions[key].source.summary(pilot));
      if (metrics[key].sourceUsed === 'detail' && metrics[key].value === 0 && isNumeric(summaryCandidate) && summaryCandidate > 0) {
        metrics[key] = { value: summaryCandidate, state: 'present', sourceUsed: 'summary' };
      }
    });
  }

  // Regression guard: when score is populated but submetrics are all default-zero, preserve unknowns.
  const hasScoredThreat = (pilot.threat?.threatScore ?? pilot.threatScore ?? 0) > 0;
  const zeroLikeNumericMetrics = [metrics.kills.value, metrics.losses.value, metrics.dangerPercent.value, metrics.soloPercent.value, metrics.avgGangSize.value]
    .every((value) => value === 0 || value === null || value === undefined);
  const noSupportingDetails = [metrics.mainShip.value, metrics.lastKill.value, metrics.lastLoss.value].every((value) => value === null || value === undefined);

  if (hasScoredThreat && zeroLikeNumericMetrics && noSupportingDetails) {
    (['kills', 'losses', 'dangerPercent', 'soloPercent', 'avgGangSize'] as const).forEach((key) => {
      if (metrics[key].value === 0) {
        metrics[key] = { value: null, state: 'missing', sourceUsed: metrics[key].sourceUsed };
      }
    });
  }

  return metrics;
}

function pickPreferredThreatBand(primary: string | undefined, secondary: string | undefined): ThreatBand {
  const preferred = primary && primary !== 'unknown'
    ? primary
    : secondary;
  return toThreatBand(preferred);
}

function toWarningView(warning: AppService.ParseWarningDTO): ParseWarningView {
  const scopedToPilot = typeof warning.characterId === 'number';
  const category = warning.category ?? 'provider';
  const presentation = resolveWarningPresentation(warning.code, category, scopedToPilot);

  return {
    provider: warning.provider,
    code: warning.code,
    rawCode: warning.code,
    message: warning.message,
    normalizedLabel: presentation.normalizedLabel,
    characterId: warning.characterId,
    characterName: warning.characterName,
    severity: warning.severity ?? 'info',
    userVisible: warning.userVisible ?? true,
    category,
    displayTier: presentation.displayTier,
  };
}

function toPilotView(pilot: AppService.PilotThreatDTO, warnings: ParseWarningView[]): PilotThreatView {
  const resolvedThreatScore = resolveMetric(pilot, {
    source: { detail: (entry) => entry.threat?.threatScore, summary: (entry) => entry.threatScore },
    transform: passthrough<number>,
    fallbackOrder: ['detail', 'summary'],
    allowSummaryFallbackWhenDetailMissing: true,
    shouldAccept: isNumeric,
  }).value;
  const threatScore = resolvedThreatScore === 0 && pilot.threatScore > 0 ? pilot.threatScore : resolvedThreatScore;
  const resolvedThreatBand = pickPreferredThreatBand(pilot.threat?.threatBand, pilot.threatBand);
  const metrics = resolvePilotMetrics(pilot);

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const debugPilotId = (window as Window & { __LOCAL_THREAT_DEBUG_PILOT_ID__?: string }).__LOCAL_THREAT_DEBUG_PILOT_ID__;
    if (debugPilotId && debugPilotId === String(pilot.identity.characterId)) {
      console.debug('[adapter:pilot-boundary]', {
        pilotId: String(pilot.identity.characterId),
        metrics,
        threatScore,
        threatBand: resolvedThreatBand,
      });
    }
  }

  const identity = pilot.identity;
  const derivedReasons = pilot.threat?.threatReasons ?? [];
  const hasAnyResolvedActivity = [metrics.kills.value, metrics.losses.value, metrics.dangerPercent.value, metrics.soloPercent.value, metrics.avgGangSize.value]
    .some((value) => typeof value === 'number' && value > 0)
    || Boolean(metrics.mainShip.value || metrics.lastKill.value || metrics.lastLoss.value);
  const reasons = derivedReasons.length > 0
    ? derivedReasons
    : (hasAnyResolvedActivity && ((threatScore as number | null | undefined) ?? 0) > 0 ? ['activity_observed'] : []);

  return {
    id: String(identity.characterId),
    identity: {
      characterId: identity.characterId,
      characterName: identity.name,
      corporationName: nullableText(identity.corpName),
      corporationTicker: nullableText(identity.corpTicker),
      allianceName: nullableText(identity.allianceName),
      allianceTicker: nullableText(identity.allianceTicker),
      portraitUrl: null,
      metadata: {
        corporationId: identity.corpId ?? null,
        allianceId: identity.allianceId ?? null,
      },
    },
    score: Math.round((threatScore as number | null | undefined) ?? 0),
    band: resolvedThreatBand,
    confidence: pilot.threat?.confidence ?? 0,
    reasons,
    tags: pilot.tags ?? [],
    notes: nullableText(pilot.threat?.notes ?? pilot.notes),
    kills: metrics.kills.value as number | null | undefined,
    losses: metrics.losses.value as number | null | undefined,
    dangerPercent: metrics.dangerPercent.value as number | null | undefined,
    soloPercent: metrics.soloPercent.value as number | null | undefined,
    avgGangSize: metrics.avgGangSize.value as number | null | undefined,
    mainShip: metrics.mainShip.value as string | null | undefined,
    lastKill: metrics.lastKill.value as string | null | undefined,
    lastLoss: metrics.lastLoss.value as string | null | undefined,
    freshness: {
      source: nullableText(pilot.freshness?.source),
      dataAsOf: normalizeTimestampOrNull(pilot.freshness?.dataAsOf),
      isStale: pilot.freshness?.isStale ?? null,
    },
    warnings,
  };
}

function toSettingsViewModel(dto: AppService.SettingsDTO): SettingsViewModel {
  return {
    scoring: dto.scoring,
    visibleColumns: {},
    appearance: { density: 'comfortable', theme: 'system' },
    ttl: { zkillStatsSeconds: 300, zkillDetailSeconds: 120 },
    entities: {
      ignoredCorporations: dto.ignoredCorps,
      ignoredAlliances: dto.ignoredAlliances,
      pinnedCharacters: dto.pinnedPilots,
    },
  };
}

function toSettingsDTO(model: SettingsViewModel): AppService.SettingsDTO {
  return {
    ignoredCorps: model.entities.ignoredCorporations,
    ignoredAlliances: model.entities.ignoredAlliances,
    pinnedPilots: model.entities.pinnedCharacters,
    refreshInterval: 30,
    scoring: model.scoring,
  };
}

export function toAnalysisSessionView(dto: AppService.AnalysisSessionDTO): AnalysisSessionView {
  const unresolvedNames = dto.unresolvedNames ?? [];
  const candidateNamesCount = dto.source.candidateNames.length;
  const resolvedCount = dto.pilots.length;
  const warnings: ParseWarningView[] = dto.warnings.map(toWarningView);
  const globalWarnings = warnings.filter((warning) => !warning.characterId && warning.displayTier === 'status_strip');
  const warningsByPilotId: Record<string, ParseWarningView[]> = {};
  warnings.forEach((warning) => {
    if (!warning.characterId) return;
    const key = String(warning.characterId);
    warningsByPilotId[key] = warningsByPilotId[key] ?? [];
    warningsByPilotId[key].push(warning);
  });
  const severityCounts = warnings.reduce<Record<'info' | 'warn' | 'error', number>>((acc, warning) => {
    const severity = warning.severity ?? 'info';
    acc[severity] += 1;
    return acc;
  }, { info: 0, warn: 0, error: 0 });
  const providerCounts = warnings.reduce<Record<string, number>>((acc, warning) => {
    const provider = warning.provider ?? 'unknown';
    acc[provider] = (acc[provider] ?? 0) + 1;
    return acc;
  }, {});
  const warningCodeCounts = globalWarnings.reduce<Record<string, number>>((acc, warning) => {
    acc[warning.code] = (acc[warning.code] ?? 0) + 1;
    return acc;
  }, {});

  const warningDisplayDto = (dto as AppService.AnalysisSessionDTO & {
    warningDisplay?: {
      global?: { items?: Array<{ label?: string; count?: number }> };
      rowHints?: Array<{ characterId?: number; count?: number; hasImpact?: boolean }>;
      byPilot?: Array<{ characterId?: number; items?: Array<{ label?: string; count?: number; impactsRecency?: boolean; impactsTimestamps?: boolean }> }>;
    };
  }).warningDisplay;

  const rowHintCounts = new Map<number, { count: number; hasImpact: boolean }>();
  warningDisplayDto?.rowHints?.forEach((hint) => {
    if (typeof hint.characterId !== 'number') return;
    rowHintCounts.set(hint.characterId, {
      count: hint.count ?? 0,
      hasImpact: hint.hasImpact ?? false,
    });
  });

  rowHintCounts.forEach((_hint, characterId) => {
    const key = String(characterId);
    const existing = warningsByPilotId[key] ?? [];
    const hasRowTier = existing.some((warning) => warning.displayTier === 'row_hint');
    if (!hasRowTier) {
      warningsByPilotId[key] = existing.concat({
        code: 'ROW_HINT_WARNING',
        rawCode: 'ROW_HINT_WARNING',
        message: 'Pilot has warning details',
        normalizedLabel: 'Pilot has warning details',
        characterId,
        severity: 'warn',
        userVisible: true,
        category: 'data_quality',
        displayTier: 'row_hint',
      });
    }
  });

  const byPilotDisplay: AnalysisSessionView['diagnostics']['warningDisplay']['byPilot'] = {};
  warningDisplayDto?.byPilot?.forEach((entry) => {
    if (typeof entry.characterId !== 'number') return;
    byPilotDisplay[String(entry.characterId)] = (entry.items ?? []).map((item) => ({
      label: item.label ?? 'Warning',
      count: item.count ?? 0,
      impactsRecency: item.impactsRecency ?? false,
      impactsTimestamps: item.impactsTimestamps ?? false,
    }));
  });

  const globalDisplay = (warningDisplayDto?.global?.items ?? []).map((item) => ({
    label: item.label ?? 'Warning',
    count: item.count ?? 0,
  }));

  return {
    sessionId: dto.sessionId,
    createdAt: dto.createdAt,
    pilotCount: dto.pilots.length,
    warningCount: dto.warnings.length,
    sourceTextLength: dto.source.rawText.length,
    diagnostics: {
      candidateNamesCount,
      resolvedCount,
      unresolvedNames,
      invalidLines: dto.source.invalidLines.length,
      warnings,
      globalWarnings,
      warningsByPilotId,
      warningCodeCounts,
      severityCounts,
      providerCounts,
      warningDisplay: {
        global: globalDisplay,
        rowHints: Object.fromEntries(Array.from(rowHintCounts.entries()).map(([characterId, hint]) => [String(characterId), hint])),
        byPilot: byPilotDisplay,
      },
    },
    parseSummary: {
      candidateCount: candidateNamesCount,
      invalidLineCount: dto.source.invalidLines.length,
      duplicateRemovalCount: dto.source.removedDuplicates,
      warningCount: dto.source.warnings.length,
      warnings: dto.source.warnings.map((w) => ({ code: w.code, message: w.message })),
    },
    pilots: dto.pilots.map((pilot) => toPilotView(pilot, warningsByPilotId[String(pilot.identity.characterId)] ?? [])),
  };
}

export async function analyzePastedText(text: string): Promise<AnalysisSessionView> {
  const dto = await AppService.AnalyzePastedText(text);
  return toAnalysisSessionView(dto);
}

export async function loadRecentSessions(limit = 20): Promise<AppService.AnalysisSessionDTO[]> {
  return AppService.LoadRecentSessions(limit);
}

export async function loadSettings(): Promise<SettingsViewModel> {
  return toSettingsViewModel(await AppService.LoadSettings());
}

export async function saveSettings(settings: SettingsViewModel): Promise<SettingsViewModel> {
  return toSettingsViewModel(await AppService.SaveSettings(toSettingsDTO(settings)));
}
