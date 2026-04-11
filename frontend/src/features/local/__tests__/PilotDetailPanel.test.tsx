import { fireEvent, render, screen, within } from '@testing-library/react';
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
      pilotCount: 2,
      warningCount: 0,
      sourceTextLength: 10,
      diagnostics: {
        candidateNamesCount: 2,
        resolvedCount: 2,
        unresolvedNames: [],
        invalidLines: 0,
        warnings: [],
        globalWarnings: [{ code: 'RATE_LIMITED', message: 'Global rate limit warning', severity: 'warn', provider: 'esi', userVisible: true }],
        warningsByPilotId: {},
        severityCounts: { info: 0, warn: 1, error: 0 },
        providerCounts: {},
      },
      parseSummary: { candidateCount: 2, invalidLineCount: 0, duplicateRemovalCount: 0, warningCount: 0, warnings: [] },
      pilots: [
        {
          id: '10',
          identity: { characterId: 10, characterName: 'Alpha', corporationName: 'A Corp', corporationTicker: 'AC', allianceName: 'A Alliance', allianceTicker: 'AA', portraitUrl: null, metadata: { corporationId: 1, allianceId: 1 } },
          score: 91,
          band: 'critical',
          confidence: 0.9,
          reasons: ['FC', 'Hunter'],
          tags: ['FC', 'Hunter'],
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
          warnings: [{ code: 'DETAIL_TIME_INVALID', message: 'Pilot-specific warning', severity: 'warn', provider: 'zkill', userVisible: true }],
        },
        {
          id: '11',
          identity: { characterId: 11, characterName: 'Beta', corporationName: 'B Corp', corporationTicker: null, allianceName: 'B Alliance', allianceTicker: null, portraitUrl: null, metadata: { corporationId: 2, allianceId: 2 } },
          score: 52,
          band: 'medium',
          confidence: 0.55,
          reasons: ['Stale Data'],
          tags: ['Stale Data'],
          notes: null,
          kills: null,
          losses: null,
          dangerPercent: null,
          soloPercent: null,
          avgGangSize: null,
          mainShip: null,
          lastKill: null,
          lastLoss: null,
          freshness: { source: null, dataAsOf: null, isStale: null },
          warnings: [],
        },
      ],
    },
  };
}

describe('PilotDetailPanel in LocalScreen', () => {
  it('renders all major sections for selected pilot', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    const pane = screen.getByTestId('detail-pane');
    expect(pane).toHaveTextContent('Identity');
    expect(pane).toHaveTextContent('Threat summary');
    expect(pane).toHaveTextContent('Combat stats');
    expect(pane).toHaveTextContent('Activity timing');
    expect(pane).toHaveTextContent('Why this score');
    expect(pane).toHaveTextContent('Data quality');
    expect(pane).toHaveTextContent('Notes and pilot-specific warnings');
  });

  it('renders compact no-selection state when table is empty', () => {
    const empty = buildState();
    empty.data!.pilots = [];
    render(<LocalScreen pastedText="" analyzeState={empty} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    expect(screen.getByTestId('detail-title')).toHaveTextContent('No pilot selected');
    expect(screen.getByTestId('pilot-detail-empty-message')).toHaveTextContent('Select a row to inspect identity, threat evidence, and pilot-specific warnings.');
  });

  it('shows pilot-specific warnings and reasons in detail pane only', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    const detailPane = screen.getByTestId('detail-pane');
    expect(within(detailPane).getByTestId('detail-reasons')).toHaveTextContent('FC (+30)');
    expect(within(detailPane).getByTestId('detail-warnings')).toHaveTextContent('Pilot-specific warning');
    expect(within(detailPane).getByTestId('detail-data-quality')).toHaveTextContent('Partial killmail timestamps detected');

    expect(screen.getByTestId('local-center-panel')).not.toHaveTextContent('Pilot-specific warning');
    expect(screen.getByTestId('local-center-panel')).not.toHaveTextContent('FC (+30)');
  });
});
