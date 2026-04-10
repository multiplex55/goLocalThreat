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
        normalizedText: 'Alpha\nBeta',
        parsedCharacters: [],
        candidateNames: ['Alpha'],
        invalidLines: [{ line: '123', reasonCode: 'no_letters' }],
        warnings: [{ provider: 'parser', code: 'duplicates_removed', message: 'duplicates removed' }],
        inputKind: 'local_member_list',
        confidence: 0.9,
        removedDuplicates: 2,
        suspiciousArtifacts: 1,
        parsedAt: '2026-01-01T00:00:00Z',
      },
      pilots: [{
        identity: { characterId: 777, name: 'Alpha', corpName: 'A Corp', allianceName: 'A Alliance' },
        threat: { threatScore: 65, threatBand: 'high', threatReasons: ['active'], confidence: 0.7 },
      }],
      warnings: [{ provider: 'bootstrap', code: 'PLACEHOLDER', message: 'placeholder' }],
    });

    expect(mapped).toEqual({
      sessionId: 'session-1',
      createdAt: '2026-01-01T00:00:00Z',
      pilotCount: 1,
      warningCount: 1,
      sourceTextLength: 11,
      parseSummary: {
        candidateCount: 1,
        invalidLineCount: 1,
        duplicateRemovalCount: 2,
        warningCount: 1,
        warnings: [{ code: 'duplicates_removed', message: 'duplicates removed' }],
      },
      pilots: [{
        id: '777',
        name: 'Alpha',
        corporation: 'A Corp',
        alliance: 'A Alliance',
        score: 65,
        band: 'high',
        reasons: ['active'],
        confidence: 0.7,
      }],
    });
  });
});
