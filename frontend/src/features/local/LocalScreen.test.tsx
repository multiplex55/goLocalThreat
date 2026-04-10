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
      },
      parseSummary: {
        candidateCount: 2,
        invalidLineCount: 0,
        duplicateRemovalCount: 0,
        warningCount: 0,
        warnings: [],
      },
      pilots: [
        { id: '10', name: 'Alpha', corporation: 'A Corp', alliance: 'A', score: 91, band: 'critical', reasons: ['hot'], confidence: 0.9 },
        { id: '11', name: 'Beta', corporation: 'B Corp', alliance: 'B', score: 52, band: 'medium', reasons: ['active'], confidence: 0.8 },
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

  it('switching selected row updates DetailPanel props', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    fireEvent.click(screen.getByRole('button', { name: /Beta · 52 · medium/i }));
    expect(screen.getByTestId('detail-pane')).toHaveTextContent('Corporation: B Corp');
    expect(screen.getByTestId('detail-title')).toHaveTextContent('Beta');
  });
});
