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

function pickPreferredNonZeroNumber(primary: number | null | undefined, secondary: number | null | undefined): number | null {
  const hasPrimary = typeof primary === 'number';
  const hasSecondary = typeof secondary === 'number';
  if (hasPrimary && primary !== 0) return primary;
  if (hasSecondary && secondary !== 0) return secondary;
  if (hasPrimary) return primary;
  if (hasSecondary) return secondary;
  return null;
}

function pickPreferredNonEmptyText(primary: string | undefined, secondary: string | undefined): string | null {
  return nullableText(primary) ?? nullableText(secondary);
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
  const identity = pilot.identity;
  const threatScore = pickPreferredNonZeroNumber(pilot.threat?.threatScore, pilot.threatScore);
  const resolvedThreatBand = pickPreferredThreatBand(pilot.threat?.threatBand, pilot.threatBand);

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const debugPilotId = (window as Window & { __LOCAL_THREAT_DEBUG_PILOT_ID__?: string }).__LOCAL_THREAT_DEBUG_PILOT_ID__;
    if (debugPilotId && debugPilotId === String(identity.characterId)) {
      console.debug('[adapter:pilot-boundary]', {
        pilotId: String(identity.characterId),
        kills: pickPreferredNonZeroNumber(pilot.threat?.recentKills, pilot.kills),
        losses: pickPreferredNonZeroNumber(pilot.threat?.recentLosses, pilot.losses),
        dangerPercent: pickPreferredNonZeroNumber(pilot.threat?.dangerPercent, pilot.dangerPercent),
        soloPercent: pickPreferredNonZeroNumber(pilot.threat?.soloPercent, pilot.soloPercent),
        avgGangSize: pickPreferredNonZeroNumber(pilot.threat?.avgGangSize, pilot.avgGangSize),
        mainShip: pickPreferredNonEmptyText(pilot.threat?.mainShip, pilot.mainShip),
        lastKill: normalizeTimestampOrNull(pilot.threat?.lastKill) ?? normalizeTimestampOrNull(pilot.lastKill),
        lastLoss: normalizeTimestampOrNull(pilot.threat?.lastLoss) ?? normalizeTimestampOrNull(pilot.lastLoss),
        threatScore,
        threatBand: resolvedThreatBand,
      });
    }
  }

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
    score: Math.round(threatScore ?? 0),
    band: resolvedThreatBand,
    confidence: pilot.threat?.confidence ?? 0,
    reasons: pilot.threat?.threatReasons ?? [],
    tags: pilot.tags ?? [],
    notes: nullableText(pilot.threat?.notes ?? pilot.notes),
    kills: pickPreferredNonZeroNumber(pilot.threat?.recentKills, pilot.kills),
    losses: pickPreferredNonZeroNumber(pilot.threat?.recentLosses, pilot.losses),
    dangerPercent: pickPreferredNonZeroNumber(pilot.threat?.dangerPercent, pilot.dangerPercent),
    soloPercent: pickPreferredNonZeroNumber(pilot.threat?.soloPercent, pilot.soloPercent),
    avgGangSize: pickPreferredNonZeroNumber(pilot.threat?.avgGangSize, pilot.avgGangSize),
    mainShip: pickPreferredNonEmptyText(pilot.threat?.mainShip, pilot.mainShip),
    lastKill: normalizeTimestampOrNull(pilot.threat?.lastKill) ?? normalizeTimestampOrNull(pilot.lastKill),
    lastLoss: normalizeTimestampOrNull(pilot.threat?.lastLoss) ?? normalizeTimestampOrNull(pilot.lastLoss),
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

// Migration note: this is the canonical DTO -> UI mapping path.
// Keep backend field normalization here so feature-level code does not fork transform logic.
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
