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
        { id: '10', name: 'Alpha', corporation: 'A Corp', alliance: 'A', score: 91, band: 'critical', reasons: ['FC', 'Hunter'], confidence: 0.9 },
        { id: '11', name: 'Beta', corporation: 'B Corp', alliance: 'B', score: 52, band: 'medium', reasons: ['Stale Data'], confidence: 0.55 },
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
    state.data!.diagnostics.warningsByPilotId = {
      '11': [{ code: 'DETAIL_TIME_INVALID', message: 'Beta had invalid time', severity: 'info', provider: 'zkill', userVisible: false }],
    };

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
});
