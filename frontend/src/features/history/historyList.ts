import { loadRecentSessions, toAnalysisSessionView } from '../../lib/api';
import type { AnalysisSessionView } from '../../types/analysis';

export interface HistoryListState {
  sessions: AnalysisSessionView[];
  selectedSessionId: string | null;
}

export async function loadHistoryList(): Promise<HistoryListState> {
  const sessions = await loadRecentSessions();
  return {
    sessions: sessions.map(toAnalysisSessionView),
    selectedSessionId: sessions[0]?.sessionId ?? null,
  };
}

export function reopenSession(history: HistoryListState, sessionId: string): AnalysisSessionView | null {
  return history.sessions.find((session) => session.sessionId === sessionId) ?? null;
}

export function inspectStoredSummary(history: HistoryListState, sessionId: string): AnalysisSessionView['parseSummary'] | null {
  const session = reopenSession(history, sessionId);
  return session?.parseSummary ?? null;
}
