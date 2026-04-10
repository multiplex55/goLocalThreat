import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocalFeature } from './LocalFeature';
import type { AnalyzeState } from './analyzeState';

function buildAnalyzeState(overrides?: Partial<AnalyzeState>): AnalyzeState {
  return {
    status: 'success',
    errorKey: null,
    message: null,
    data: {
      sessionId: 'session-1',
      createdAt: '2026-01-01T00:00:00Z',
      pilotCount: 0,
      warningCount: 0,
      sourceTextLength: 10,
      diagnostics: {
        candidateNamesCount: 0,
        resolvedCount: 0,
        unresolvedNames: [],
        invalidLines: 0,
        warnings: [],
      },
      parseSummary: {
        candidateCount: 0,
        invalidLineCount: 0,
        duplicateRemovalCount: 0,
        warningCount: 0,
        warnings: [],
      },
      pilots: [],
    },
    ...overrides,
  };
}

describe('LocalFeature diagnostics', () => {
  const handlers = {
    onPasteChange: vi.fn(),
    onAnalyze: vi.fn(),
    onRetry: vi.fn(),
    onSelectPilot: vi.fn(),
  };

  it('renders unresolved diagnostic message when candidates > 0 and pilots = 0', () => {
    render(
      <LocalFeature
        pastedText="Alpha"
        selectedPilotId={null}
        analyzeState={buildAnalyzeState({
          data: {
            ...buildAnalyzeState().data!,
            diagnostics: {
              candidateNamesCount: 2,
              resolvedCount: 0,
              unresolvedNames: ['Alpha', 'Beta'],
              invalidLines: 0,
              warnings: [],
            },
            parseSummary: {
              ...buildAnalyzeState().data!.parseSummary,
              candidateCount: 2,
            },
          },
        })}
        {...handlers}
      />,
    );

    expect(screen.getByTestId('unresolved-empty-state')).toHaveTextContent(
      'Parsed 2 names, but none could be resolved through ESI.',
    );
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('renders warnings block when warnings is non-empty', () => {
    render(
      <LocalFeature
        pastedText="Alpha"
        selectedPilotId={null}
        analyzeState={buildAnalyzeState({
          data: {
            ...buildAnalyzeState().data!,
            diagnostics: {
              ...buildAnalyzeState().data!.diagnostics,
              warnings: ['esi: rate limited'],
            },
          },
        })}
        {...handlers}
      />,
    );

    expect(screen.getByTestId('provider-warnings')).toHaveTextContent('esi: rate limited');
  });

  it('renders invalid line summary when provided', () => {
    render(
      <LocalFeature
        pastedText="Alpha"
        selectedPilotId={null}
        analyzeState={buildAnalyzeState({
          data: {
            ...buildAnalyzeState().data!,
            diagnostics: {
              ...buildAnalyzeState().data!.diagnostics,
              invalidLines: 3,
            },
          },
        })}
        {...handlers}
      />,
    );

    expect(screen.getByTestId('invalid-lines-summary')).toHaveTextContent('Invalid lines detected: 3');
  });

  it('does not show unresolved-state banner for normal successful pilot table', () => {
    render(
      <LocalFeature
        pastedText="Alpha"
        selectedPilotId={null}
        analyzeState={buildAnalyzeState({
          data: {
            ...buildAnalyzeState().data!,
            pilotCount: 1,
            diagnostics: {
              candidateNamesCount: 1,
              resolvedCount: 1,
              unresolvedNames: [],
              invalidLines: 0,
              warnings: [],
            },
            pilots: [
              {
                id: '1',
                name: 'Alpha',
                corporation: 'A Corp',
                alliance: 'A Alliance',
                score: 22,
                band: 'low',
                reasons: [],
                confidence: 0.6,
              },
            ],
          },
        })}
        {...handlers}
      />,
    );

    expect(screen.queryByTestId('unresolved-empty-state')).not.toBeInTheDocument();
    expect(screen.getByTestId('threat-table')).toHaveTextContent('Alpha · 22 · low');
  });
});
