import { describe, expect, it } from 'vitest';
import { initialAnalyzeState, mapAnalyzeError, reduceAnalyzeState } from './analyzeState';

describe('analyze state machine', () => {
  it('transitions idle -> loading -> success', () => {
    const loading = reduceAnalyzeState(initialAnalyzeState, { type: 'START' });
    expect(loading.status).toBe('loading');

    const success = reduceAnalyzeState(loading, {
      type: 'SUCCESS',
      payload: {
        sessionId: 's-1',
        createdAt: '2026-01-01T00:00:00Z',
        pilotCount: 1,
        warningCount: 0,
        sourceTextLength: 5,
        diagnostics: {
          candidateNamesCount: 1,
          resolvedCount: 1,
          unresolvedNames: [],
          invalidLines: 0,
          warnings: [],
          globalWarnings: [],
          warningsByPilotId: {},
          severityCounts: { info: 0, warn: 0, error: 0 },
          providerCounts: {},
        },
        parseSummary: {
          candidateCount: 1,
          invalidLineCount: 0,
          duplicateRemovalCount: 0,
          warningCount: 0,
          warnings: [],
        },
        pilots: [{ id: '1', name: 'Alpha', corporation: 'Corp', alliance: 'Alliance', score: 80, band: 'high', reasons: [], confidence: 0.9 }],
      },
    });

    expect(success.status).toBe('success');
    expect(success.data?.pilotCount).toBe(1);
  });

  it('transitions idle -> loading -> error', () => {
    const loading = reduceAnalyzeState(initialAnalyzeState, { type: 'START' });
    const failure = reduceAnalyzeState(loading, {
      type: 'ERROR',
      errorKey: 'provider_failure',
      message: 'provider down',
    });

    expect(failure.status).toBe('error');
    expect(failure.errorKey).toBe('provider_failure');
  });

  it('maps deterministic error messages', () => {
    expect(mapAnalyzeError(new Error('network timeout')).errorKey).toBe('network_failure');
    expect(mapAnalyzeError(new Error('provider unavailable')).errorKey).toBe('provider_failure');
    expect(mapAnalyzeError(new Error('empty paste')).errorKey).toBe('invalid_paste');
  });
});
