import type { AnalysisSessionView } from '../types/analysis';

export function renderAnalysisSessionMeta(view: AnalysisSessionView): string {
  return `Session ${view.sessionId} created ${view.createdAt} with ${view.pilotCount} pilots and ${view.warningCount} warnings.`;
}
