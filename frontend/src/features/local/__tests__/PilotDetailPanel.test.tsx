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
      warningCount: 4,
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
        severityCounts: { info: 1, warn: 3, error: 0 },
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
          reasons: ['Hunter', 'FC', 'Cyno', 'Logi bait'],
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
            { code: 'DETAIL_TIME_INVALID', rawCode: 'DETAIL_TIME_INVALID', message: 'provider says detail invalid', severity: 'warn', provider: 'zkill', userVisible: true, category: 'data_quality', displayTier: 'detail_panel' },
            { code: 'DETAIL_TIME_INVALID', rawCode: 'DETAIL_TIME_INVALID', message: 'duplicate', severity: 'warn', provider: 'zkill', userVisible: true, category: 'data_quality', displayTier: 'detail_panel' },
            { code: 'DETAIL_ACTIVITY_INCOMPLETE', rawCode: 'DETAIL_ACTIVITY_INCOMPLETE', message: 'recent may be missing', severity: 'warn', provider: 'zkill', userVisible: true, category: 'data_quality', displayTier: 'detail_panel' },
            { code: 'NETWORK_PROVIDER_WARN', rawCode: 'NETWORK_PROVIDER_WARN', message: 'degraded provider', severity: 'warn', provider: 'zkill', userVisible: true, category: 'provider', displayTier: 'detail_panel' },
          ],
        },
      ],
    },
  };
}

describe('PilotDetailPanel in LocalScreen', () => {
  it('renders detail sections in the expected order', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    const detailPane = screen.getByTestId('detail-pane');
    const headings = within(detailPane).getAllByRole('heading', { level: 4 }).map((node) => node.textContent);
    expect(headings).toEqual(['Identity', 'Summary metrics', 'Why this score', 'Warnings & data quality']);
  });

  it('shows only top 3 reasons in why-this-score block', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);
    const reasons = within(screen.getByTestId('detail-reasons')).getAllByRole('listitem');
    expect(reasons).toHaveLength(3);
    expect(screen.getByTestId('detail-reasons')).toHaveTextContent('Hunter (+30)');
    expect(screen.getByTestId('detail-reasons')).not.toHaveTextContent('Logi bait');
  });

  it('groups warnings into human-readable categories', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    const warnings = screen.getByTestId('detail-warnings');
    expect(warnings).toHaveTextContent('Data quality: Partial timestamps, Recent activity incomplete');
    expect(warnings).toHaveTextContent('Provider: degraded provider');
    expect(warnings.textContent?.match(/Partial timestamps/g)?.length).toBe(1);
  });
});
