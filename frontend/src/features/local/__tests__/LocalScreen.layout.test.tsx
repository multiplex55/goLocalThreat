import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocalScreen } from '../LocalScreen';
import type { AnalyzeState } from '../analyzeState';

function buildState(pilotCount = 2): AnalyzeState {
  return {
    status: 'success',
    errorKey: null,
    message: null,
    data: {
      sessionId: 'layout-s1',
      createdAt: '2026-01-01T00:00:00Z',
      pilotCount,
      warningCount: 0,
      sourceTextLength: 10,
      diagnostics: {
        candidateNamesCount: pilotCount,
        resolvedCount: pilotCount,
        unresolvedNames: [],
        invalidLines: 0,
        warnings: [],
        globalWarnings: [],
        warningsByPilotId: {},
        severityCounts: { info: 0, warn: 0, error: 0 },
        providerCounts: {},
      },
      parseSummary: {
        candidateCount: pilotCount,
        invalidLineCount: 0,
        duplicateRemovalCount: 0,
        warningCount: 0,
        warnings: [],
      },
      pilots: Array.from({ length: pilotCount }).map((_, idx) => ({
        id: String(idx + 1),
        identity: {
          characterId: idx + 1,
          characterName: `Pilot ${idx + 1}`,
          corporationName: 'Corp',
          corporationTicker: null,
          allianceName: 'Alliance',
          allianceTicker: null,
          portraitUrl: null,
          metadata: { corporationId: 1, allianceId: 1 },
        },
        score: 50,
        band: 'medium',
        confidence: 0.8,
        reasons: ['Test'],
        tags: [],
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
      })),
    },
  };
}

describe('LocalScreen layout regions', () => {
  it('renders top-left-center-right-bottom regions in logical DOM order', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    const screenRoot = screen.getByTestId('local-screen');
    const children = within(screenRoot).getAllByTestId(/local-(top-toolbar|layout-grid|bottom-strip)/);
    expect(children[0]).toHaveAttribute('data-testid', 'local-top-toolbar');
    expect(children[1]).toHaveAttribute('data-testid', 'local-layout-grid');
    expect(children[2]).toHaveAttribute('data-testid', 'local-bottom-strip');

    const left = screen.getByTestId('local-left-panel');
    const center = screen.getByTestId('local-center-panel');
    const right = screen.getByTestId('local-right-panel');
    const mainGrid = screen.getByTestId('local-layout-grid');
    expect(mainGrid.contains(left)).toBe(true);
    expect(mainGrid.contains(center)).toBe(true);
    expect(mainGrid.contains(right)).toBe(true);
  });

  it('keeps diagnostics strip mounted even when no table rows exist', () => {
    const { rerender } = render(
      <LocalScreen pastedText="" analyzeState={buildState(2)} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />,
    );

    expect(screen.getByTestId('local-bottom-strip')).toBeInTheDocument();

    rerender(
      <LocalScreen pastedText="" analyzeState={buildState(0)} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />,
    );

    expect(screen.getByTestId('local-bottom-strip')).toBeInTheDocument();
    expect(screen.getByTestId('diagnostics-expander')).toBeInTheDocument();
  });
});
