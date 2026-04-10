import * as AppService from '../../../wailsjs/go/main/AppService';
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

export async function loadRecentSessions(): Promise<AppService.AnalysisSessionDTO[]> {
  return AppService.LoadRecentSessions();
}

export async function loadSettings(): Promise<SettingsViewModel> {
  return AppService.LoadSettings() as Promise<SettingsViewModel>;
}

export async function saveSettings(settings: SettingsViewModel): Promise<SettingsViewModel> {
  return AppService.SaveSettings(settings) as Promise<SettingsViewModel>;
}
