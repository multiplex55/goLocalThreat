import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocalScreen } from '../LocalScreen';
import type { AnalyzeState } from '../analyzeState';

function buildState(): AnalyzeState {
  return {
    status: 'success',
    errorKey: null,
    message: null,
    data: {
      sessionId: 's1',
      createdAt: '2026-01-01T00:00:00Z',
      pilotCount: 1,
      warningCount: 1,
      sourceTextLength: 10,
      diagnostics: {
        candidateNamesCount: 1,
        resolvedCount: 1,
        unresolvedNames: [],
        invalidLines: 0,
        warnings: [],
        globalWarnings: [{ code: 'TRANSPORT_TIMEOUT', rawCode: 'TRANSPORT_TIMEOUT', message: 'socket timeout', normalizedLabel: 'Recent activity incomplete', severity: 'warn', provider: 'esi', userVisible: true, category: 'transport', displayTier: 'status_strip' }],
        warningsByPilotId: {},
        warningCodeCounts: {},
        warningDisplay: {
          global: [{ label: 'Recent activity incomplete', count: 3 }],
          rowHints: {},
          byPilot: {},
        },
        severityCounts: { info: 0, warn: 1, error: 0 },
        providerCounts: {},
      },
      parseSummary: { candidateCount: 1, invalidLineCount: 0, duplicateRemovalCount: 0, warningCount: 0, warnings: [] },
      pilots: [{
        id: '10',
        identity: { characterId: 10, characterName: 'Alpha', corporationName: 'A Corp', corporationTicker: 'AC', allianceName: 'A Alliance', allianceTicker: 'AA', portraitUrl: null, metadata: { corporationId: 1, allianceId: 1 } },
        score: 91,
        band: 'critical',
        confidence: 0.9,
        reasons: ['FC'],
        tags: ['FC'],
        notes: 'Keep tackled first',
        kills: 7,
        losses: 1,
        dangerPercent: 80,
        soloPercent: 50,
        avgGangSize: 3,
        mainShip: 'Sabre',
        lastKill: '2026-01-01T00:00:00Z',
        lastLoss: '2025-12-01T00:00:00Z',
        freshness: { source: 'zkill', dataAsOf: '2026-01-01T00:00:00Z', isStale: false },
        warnings: [],
      }],
    },
  };
}

describe('StatusBarWarnings', () => {
  it('keeps global status concise and code-free for end users', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    expect(screen.getByTestId('bottom-strip-warnings')).toHaveTextContent('Recent activity incomplete: 3');
    expect(screen.getByTestId('bottom-strip-warnings')).not.toHaveTextContent('TRANSPORT_TIMEOUT');
  });
});
