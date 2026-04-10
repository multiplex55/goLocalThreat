import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import App from './App';
import * as api from './lib/api';

vi.mock('./lib/api', async () => {
  const actual = await vi.importActual<typeof import('./lib/api')>('./lib/api');
  return {
    ...actual,
    analyzePastedText: vi.fn(),
  };
});

const mockedAnalyze = vi.mocked(api.analyzePastedText);

describe('App shell', () => {
  beforeEach(() => {
    mockedAnalyze.mockReset();
  });

  it('switches tabs and preserves screen-specific state boundaries', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByTestId('paste-textbox'), 'alpha');
    await user.click(screen.getByRole('button', { name: 'History' }));
    await user.type(screen.getByTestId('history-query'), 'session-1');
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.type(screen.getByTestId('settings-note'), 'dense table');

    await user.click(screen.getByRole('button', { name: 'Local' }));
    expect(screen.getByTestId('paste-textbox')).toHaveValue('alpha');

    await user.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByTestId('history-query')).toHaveValue('session-1');

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByTestId('settings-note')).toHaveValue('dense table');
  });

  it('renders table and detail pane from analyze payload', async () => {
    const user = userEvent.setup();
    mockedAnalyze.mockResolvedValueOnce({
      sessionId: 's-1',
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
    });

    render(<App />);
    await user.type(screen.getByTestId('paste-textbox'), 'Alpha\nBeta');
    await user.click(screen.getByRole('button', { name: 'Analyze' }));

    await waitFor(() => expect(screen.getByText(/Alpha · 91/)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Beta · 52/ }));
    expect(screen.getByTestId('detail-pane')).toHaveTextContent('Beta');
    expect(screen.getByTestId('status-bar')).toHaveTextContent('success · 2 pilots');
  });

  it('shows invalid paste and retryable provider/network errors plus empty state', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Analyze' }));
    expect(screen.getByTestId('analyze-error')).toHaveTextContent('Paste at least one line before analyzing.');

    mockedAnalyze.mockRejectedValueOnce(new Error('provider unavailable'));
    await user.type(screen.getByTestId('paste-textbox'), 'Alpha');
    await user.click(screen.getByRole('button', { name: 'Analyze' }));
    await waitFor(() => expect(screen.getByTestId('analyze-error')).toHaveTextContent('Data provider failed.'));
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();

    mockedAnalyze.mockResolvedValueOnce({
      sessionId: 's-empty',
      createdAt: '2026-01-01T00:00:00Z',
      pilotCount: 0,
      warningCount: 0,
      sourceTextLength: 5,
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
    });

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByTestId('empty-state')).toHaveTextContent('No threats found.'));
  });
});
