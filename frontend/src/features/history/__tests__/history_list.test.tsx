import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inspectStoredSummary, loadHistoryList, reopenSession } from '../historyList';

vi.mock('../../../lib/api', () => ({
  loadRecentSessions: vi.fn(),
  toAnalysisSessionView: vi.fn((dto) => ({
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
      warnings: dto.source.warnings.map((warning: { code: string; message: string }) => ({ code: warning.code, message: warning.message })),
    },
  })),
}));

import { loadRecentSessions } from '../../../lib/api';

const mockedLoadRecentSessions = vi.mocked(loadRecentSessions);

describe('history list', () => {
  beforeEach(() => {
    mockedLoadRecentSessions.mockReset();
  });

  it('reopens a previous session and inspects stored summary data', async () => {
    mockedLoadRecentSessions.mockResolvedValue([
      {
        sessionId: 'session-2',
        createdAt: '2026-01-02T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
        pilots: [1],
        warnings: [],
        source: {
          rawText: 'Alpha',
          normalizedText: 'Alpha',
          parsedCharacters: [],
          candidateNames: ['Alpha'],
          invalidLines: [],
          warnings: [{ provider: 'parser', code: 'duplicates_removed', message: 'removed dupes' }],
          inputKind: 'local_member_list',
          confidence: 1,
          removedDuplicates: 1,
          suspiciousArtifacts: 0,
          parsedAt: '2026-01-02T00:00:00Z',
        },
      },
    ] as any);

    const history = await loadHistoryList();
    const reopened = reopenSession(history, 'session-2');
    const summary = inspectStoredSummary(history, 'session-2');

    expect(reopened?.sessionId).toBe('session-2');
    expect(summary?.duplicateRemovalCount).toBe(1);
  });
});
