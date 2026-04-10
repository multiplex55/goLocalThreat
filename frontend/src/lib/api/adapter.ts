import * as AppService from '../../../wailsjs/go/app/AppService';
import type { SettingsViewModel } from '../../features/settings/types';
import type { AnalysisSessionView, ParseWarningView, PilotThreatView } from '../../types/analysis';

function toPilotView(pilot: AppService.PilotThreatDTO, index: number): PilotThreatView {
  const id = String(pilot.identity?.characterId ?? `pilot-${index}`);
  return {
    id,
    name: pilot.identity?.name ?? `Unknown #${index + 1}`,
    corporation: pilot.identity?.corpId ? `Corp #${pilot.identity.corpId}` : 'Unknown corporation',
    alliance: pilot.identity?.allianceId ? `Alliance #${pilot.identity.allianceId}` : 'Unknown alliance',
    score: Math.round(pilot.threat?.threatScore ?? 0),
    band: pilot.threat?.threatBand ?? 'unknown',
    reasons: pilot.threat?.threatReasons ?? [],
    confidence: pilot.threat?.confidence ?? 0,
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
  const warnings: ParseWarningView[] = dto.warnings.map((warning) => ({
    provider: warning.provider,
    code: warning.code,
    message: warning.message,
    characterId: warning.characterId,
    characterName: warning.characterName,
    severity: warning.severity ?? 'info',
    userVisible: warning.userVisible ?? true,
    category: warning.category,
  }));
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
    pilots: dto.pilots.map(toPilotView),
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
