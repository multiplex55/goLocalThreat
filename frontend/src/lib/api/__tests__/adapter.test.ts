import { describe, expect, it } from 'vitest';
import { toAnalysisSessionView } from '../adapter';

describe('api adapter', () => {
  it('maps backend dto to stable ui model shape', () => {
    const mapped = toAnalysisSessionView({
      sessionId: 'session-1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      source: {
        rawText: 'Alpha\\nBeta',
        parsedCharacters: [],
        warnings: [],
        parsedAt: '2026-01-01T00:00:00Z',
      },
      pilots: [],
      warnings: [{ provider: 'bootstrap', code: 'PLACEHOLDER', message: 'placeholder' }],
    });

    expect(mapped).toEqual({
      sessionId: 'session-1',
      createdAt: '2026-01-01T00:00:00Z',
      pilotCount: 0,
      warningCount: 1,
      sourceTextLength: 11,
    });
  });
});
