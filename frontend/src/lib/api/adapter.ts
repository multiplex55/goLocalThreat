import * as AppService from '../../../wailsjs/go/app/AppService';
import type { AnalysisSessionView } from '../../types/analysis';

export function toAnalysisSessionView(dto: AppService.AnalysisSessionDTO): AnalysisSessionView {
  return {
    sessionId: dto.sessionId,
    createdAt: dto.createdAt,
    pilotCount: dto.pilots.length,
    warningCount: dto.warnings.length,
    sourceTextLength: dto.source.rawText.length,
  };
}

export async function analyzePastedText(text: string): Promise<AnalysisSessionView> {
  const dto = await AppService.AnalyzePastedText(text);
  return toAnalysisSessionView(dto);
}
