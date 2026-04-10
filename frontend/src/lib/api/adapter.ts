import * as AppService from '@app-service';
import type { SettingsViewModel } from '../../features/settings/types';
import type { AnalysisSessionView } from '../../types/analysis';

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
