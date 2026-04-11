import { render, screen, within } from '@testing-library/react';
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
      warningCount: 2,
      sourceTextLength: 10,
      diagnostics: {
        candidateNamesCount: 1,
        resolvedCount: 1,
        unresolvedNames: [],
        invalidLines: 0,
        warnings: [],
        globalWarnings: [],
        warningsByPilotId: {},
        warningCodeCounts: {},
        severityCounts: { info: 1, warn: 1, error: 0 },
        providerCounts: {},
      },
      parseSummary: { candidateCount: 1, invalidLineCount: 0, duplicateRemovalCount: 0, warningCount: 0, warnings: [] },
      pilots: [
        {
          id: '10',
          identity: { characterId: 10, characterName: 'Alpha', corporationName: 'A Corp', corporationTicker: 'AC', allianceName: 'A Alliance', allianceTicker: 'AA', portraitUrl: null, metadata: { corporationId: 1, allianceId: 1 } },
          score: 91,
          band: 'critical',
          confidence: 0.9,
          reasons: [],
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
          warnings: [
            { code: 'DETAIL_TIME_INVALID', rawCode: 'DETAIL_TIME_INVALID', message: 'provider says detail invalid', normalizedLabel: 'Partial timestamps', severity: 'warn', provider: 'zkill', userVisible: true, category: 'data_quality', displayTier: 'detail_panel' },
            { code: 'DETAIL_TIME_INVALID', rawCode: 'DETAIL_TIME_INVALID', message: 'duplicate', normalizedLabel: 'Partial timestamps', severity: 'warn', provider: 'zkill', userVisible: true, category: 'data_quality', displayTier: 'detail_panel' },
          ],
        },
      ],
    },
  };
}

describe('PilotDetailPanel in LocalScreen', () => {
  it('shows grouped pilot warning explanations in detail panel', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    const detailPane = screen.getByTestId('detail-pane');
    const warnings = within(detailPane).getByTestId('detail-warnings');
    expect(warnings).toHaveTextContent('Partial timestamps (2)');
    expect(warnings.textContent?.match(/Partial timestamps/g)?.length).toBe(1);
  });
});
