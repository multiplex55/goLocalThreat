import * as AppService from '../../../wailsjs/go/app/AppService';
import type { SettingsViewModel } from '../../features/settings/types';
import type { AnalysisSessionView, ParseWarningView, PilotThreatView, ThreatBand } from '../../types/analysis';

function toThreatBand(band: string | undefined): ThreatBand {
  if (band === 'critical' || band === 'high' || band === 'medium' || band === 'low') return band;
  return 'unknown';
}


function nullableText(value: string | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function toWarningView(warning: AppService.ParseWarningDTO): ParseWarningView {
  return {
    provider: warning.provider,
    code: warning.code,
    message: warning.message,
    characterId: warning.characterId,
    characterName: warning.characterName,
    severity: warning.severity ?? 'info',
    userVisible: warning.userVisible ?? true,
    category: warning.category,
  };
}

function toPilotView(pilot: AppService.PilotThreatDTO, warnings: ParseWarningView[]): PilotThreatView {
  const identity = pilot.identity;

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
    score: Math.round(pilot.threat?.threatScore ?? pilot.threatScore ?? 0),
    band: toThreatBand(pilot.threat?.threatBand ?? pilot.threatBand),
    confidence: pilot.threat?.confidence ?? 0,
    reasons: pilot.threat?.threatReasons ?? [],
    tags: pilot.tags ?? [],
    notes: nullableText(pilot.threat?.notes ?? pilot.notes),
    kills: pilot.threat?.recentKills ?? pilot.kills ?? null,
    losses: pilot.threat?.recentLosses ?? pilot.losses ?? null,
    dangerPercent: pilot.threat?.dangerPercent ?? pilot.dangerPercent ?? null,
    soloPercent: pilot.threat?.soloPercent ?? pilot.soloPercent ?? null,
    avgGangSize: pilot.threat?.avgGangSize ?? pilot.avgGangSize ?? null,
    mainShip: nullableText(pilot.threat?.mainShip ?? pilot.mainShip),
    lastKill: nullableText(pilot.threat?.lastKill ?? pilot.lastKill),
    lastLoss: nullableText(pilot.threat?.lastLoss ?? pilot.lastLoss),
    freshness: {
      source: nullableText(pilot.freshness?.source),
      dataAsOf: nullableText(pilot.freshness?.dataAsOf),
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
  const globalWarnings = warnings.filter((warning) => !warning.characterId);
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
