import * as AppService from '../../../wailsjs/go/app/AppService';
import type { SettingsViewModel } from '../../features/settings/types';
import type { AnalysisSessionView, PilotThreatView } from '../../types/analysis';

function toPilotView(pilot: AppService.PilotThreatDTO, index: number): PilotThreatView {
  const id = String(pilot.identity?.characterId ?? `pilot-${index}`);
  return {
    id,
    name: pilot.identity?.name ?? `Unknown #${index + 1}`,
    corporation: pilot.identity?.corpName ?? 'Unknown corporation',
    alliance: pilot.identity?.allianceName ?? 'Unknown alliance',
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
  return {
    sessionId: dto.sessionId,
    createdAt: dto.createdAt,
    pilotCount: dto.pilots.length,
    warningCount: dto.warnings.length,
    sourceTextLength: dto.source.rawText.length,
    parseSummary: {
      candidateCount: dto.source.candidateNames.length,
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
