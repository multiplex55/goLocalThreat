import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocalScreen } from './LocalScreen';
import type { AnalyzeState } from './analyzeState';

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
        unresolvedNames: ['Ghost'],
        invalidLines: 0,
        warnings: [],
        globalWarnings: [],
        warningsByPilotId: {},
        severityCounts: { info: 0, warn: 0, error: 0 },
        providerCounts: {},
      },
      parseSummary: {
        candidateCount: 2,
        invalidLineCount: 0,
        duplicateRemovalCount: 0,
        warningCount: 0,
        warnings: [],
      },
      pilots: [
        {
          id: '10',
          identity: { characterId: 10, characterName: 'Alpha', corporationName: 'A Corp', corporationTicker: null, allianceName: 'A', allianceTicker: null, portraitUrl: null, metadata: { corporationId: 1, allianceId: 1 } },
          score: 91,
          band: 'critical',
          confidence: 0.9,
          reasons: ['FC', 'Hunter'],
          tags: ['FC', 'Hunter'],
          notes: null,
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
        },
        {
          id: '11',
          identity: { characterId: 11, characterName: 'Beta', corporationName: 'B Corp', corporationTicker: null, allianceName: 'B', allianceTicker: null, portraitUrl: null, metadata: { corporationId: 2, allianceId: 2 } },
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

describe('LocalScreen', () => {
  it('renders all five major regions', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);
    expect(screen.getByTestId('local-top-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('local-left-panel')).toBeInTheDocument();
    expect(screen.getByTestId('local-center-panel')).toBeInTheDocument();
    expect(screen.getByTestId('local-right-panel')).toBeInTheDocument();
    expect(screen.getByTestId('local-bottom-strip')).toBeInTheDocument();
  });

  it('keyboard Enter triggers analyze action callback', () => {
    const onAnalyze = vi.fn();
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={onAnalyze} useLocalIntelV2Layout />);

    const screenRoot = screen.getByTestId('local-screen');
    screenRoot.focus();
    fireEvent.keyDown(screenRoot, { key: 'Enter' });

    expect(onAnalyze).toHaveBeenCalledTimes(1);
  });

  it('Arrow Up/Down updates selected row index', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    const screenRoot = screen.getByTestId('local-screen');
    screenRoot.focus();

    fireEvent.keyDown(screenRoot, { key: 'ArrowDown' });
    expect(screen.getByTestId('detail-title')).toHaveTextContent('Beta');

    fireEvent.keyDown(screenRoot, { key: 'ArrowUp' });
    expect(screen.getByTestId('detail-title')).toHaveTextContent('Alpha');
  });

  it('detail pane renders score + confidence + reasons for selected pilot', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    fireEvent.click(screen.getByText('Beta'));
    expect(screen.getByTestId('detail-pane')).toHaveTextContent('Threat: MEDIUM · 52');
    expect(screen.getByTestId('detail-pane')).toHaveTextContent('Confidence: 55%');
    expect(screen.getByTestId('detail-pane')).toHaveTextContent('Why this score: Stale Data (+30)');
  });

  it('warning list scoped only to selected pilot', () => {
    const state = buildState();
    state.data!.diagnostics.globalWarnings = [{ code: 'RATE_LIMITED', message: 'provider slow', severity: 'warn', provider: 'esi', userVisible: true }];
    state.data!.diagnostics.severityCounts = { info: 0, warn: 1, error: 0 };
    state.data!.diagnostics.providerCounts = { esi: 1 };
    state.data!.pilots[1]!.warnings = [{ code: 'DETAIL_TIME_INVALID', message: 'Beta had invalid time', severity: 'info', provider: 'zkill', userVisible: false }];

    render(<LocalScreen pastedText="" analyzeState={state} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);
    expect(screen.getByTestId('detail-warnings')).not.toHaveTextContent('Beta had invalid time');

    fireEvent.click(screen.getByText('Beta'));
    expect(screen.getByTestId('detail-warnings')).toHaveTextContent('Beta had invalid time');
  });

  it('missing-data state messaging appears when confidence is reduced', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);
    fireEvent.click(screen.getByText('Beta'));
    expect(screen.getByTestId('detail-pane')).toHaveTextContent('Data completeness: Unknown due to partial killmail timestamps');
  });

  it('semantic tag badges render based on mapped tag set', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    expect(screen.getByTestId('detail-semantic-badges')).toHaveTextContent('FC');
    expect(screen.getByTestId('detail-semantic-badges')).toHaveTextContent('Hunter');
    fireEvent.click(screen.getByText('Beta'));
    expect(screen.getByTestId('detail-semantic-badges')).toHaveTextContent('Stale Data');
  });

  it('double-click row toggles pinned state and pinned badge rendering', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    const betaCell = screen.getByText('Beta');
    fireEvent.doubleClick(betaCell);
    expect(screen.getByText('📌 Beta')).toBeInTheDocument();
    fireEvent.click(screen.getByText('📌 Beta'));
    expect(screen.getByTestId('detail-semantic-badges')).toHaveTextContent('Pinned');

    fireEvent.doubleClick(screen.getByText('📌 Beta'));
    expect(screen.queryByText('📌 Beta')).not.toBeInTheDocument();
  });

  it('copy selected/all actions produce expected payloads with feedback', () => {
    const onCopySelected = vi.fn();
    const onCopyAll = vi.fn();
    render(
      <LocalScreen
        pastedText=""
        analyzeState={buildState()}
        onPasteChange={() => {}}
        onAnalyze={() => {}}
        onCopySelected={onCopySelected}
        onCopyAll={onCopyAll}
        useLocalIntelV2Layout
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy Selected' }));
    expect(onCopySelected).toHaveBeenCalledWith('Alpha');
    expect(screen.getByTestId('action-feedback')).toHaveTextContent('Copied Alpha.');

    fireEvent.click(screen.getByRole('button', { name: 'Copy All' }));
    expect(onCopyAll).toHaveBeenCalledWith(['Alpha', 'Beta']);
    expect(screen.getByTestId('action-feedback')).toHaveTextContent('Copied 2 pilot names.');
  });

  it('refresh selected calls backend with selected pilot ID only', () => {
    const onRefreshSelected = vi.fn();
    render(
      <LocalScreen
        pastedText=""
        analyzeState={buildState()}
        onPasteChange={() => {}}
        onAnalyze={() => {}}
        onRefreshSelected={onRefreshSelected}
        useLocalIntelV2Layout
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Selected' }));
    expect(onRefreshSelected).toHaveBeenCalledWith('10');

    fireEvent.click(screen.getByText('Beta'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Selected' }));
    expect(onRefreshSelected).toHaveBeenLastCalledWith('11');
  });

  it('refresh selected shows no-op messaging when no selection exists', () => {
    const emptyState = buildState();
    emptyState.data!.pilots = [];
    const onRefreshSelected = vi.fn();

    render(
      <LocalScreen
        pastedText=""
        analyzeState={emptyState}
        onPasteChange={() => {}}
        onAnalyze={() => {}}
        onRefreshSelected={onRefreshSelected}
        useLocalIntelV2Layout
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Selected' }));
    expect(onRefreshSelected).toHaveBeenCalledWith(null);
    expect(screen.getByTestId('action-feedback')).toHaveTextContent('No selected pilot to refresh.');
  });
});
