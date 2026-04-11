import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AnalyzeState } from '../analyzeState';
import { LocalScreen } from '../LocalScreen';
import type { AnalysisSessionView, ParseWarningView, PilotThreatView } from '../../../types/analysis';

function buildWarning(overrides: Partial<ParseWarningView> = {}): ParseWarningView {
  return {
    code: 'TEST_WARNING',
    message: 'Test warning',
    severity: 'warn',
    userVisible: true,
    category: 'test',
    provider: 'zkill',
    ...overrides,
  };
}

function buildPilot(overrides: Partial<PilotThreatView> = {}): PilotThreatView {
  return {
    id: 'pilot-1',
    identity: {
      characterId: 1,
      characterName: 'Alpha Pilot',
      corporationName: 'Alpha Corp',
      corporationTicker: 'ALP',
      allianceName: 'Alpha Alliance',
      allianceTicker: 'AL',
      portraitUrl: null,
      metadata: { corporationId: 1, allianceId: 10 },
    },
    score: 82,
    band: 'high',
    confidence: 0.85,
    reasons: ['Hunter', 'Recent kills'],
    tags: ['Hunter'],
    notes: 'Alpha notes',
    kills: 17,
    losses: 5,
    dangerPercent: 77,
    soloPercent: 33,
    avgGangSize: 4,
    mainShip: 'Orthrus',
    lastKill: '2026-04-10T12:00:00Z',
    lastLoss: '2026-04-01T12:00:00Z',
    freshness: { source: 'zkill', dataAsOf: '2026-04-10T12:00:00Z', isStale: false },
    warnings: [],
    ...overrides,
  };
}

function buildAnalysisData(overrides: Partial<AnalysisSessionView> = {}): AnalysisSessionView {
  const pilots = overrides.pilots ?? [buildPilot()];
  return {
    sessionId: 'session-1',
    createdAt: '2026-04-10T12:00:00Z',
    pilotCount: pilots.length,
    warningCount: 0,
    sourceTextLength: 120,
    diagnostics: {
      candidateNamesCount: pilots.length,
      resolvedCount: pilots.length,
      unresolvedNames: [],
      invalidLines: 0,
      warnings: [],
      globalWarnings: [],
      warningsByPilotId: {},
      warningCodeCounts: {},
      severityCounts: { info: 0, warn: 0, error: 0 },
      providerCounts: {},
      ...(overrides.diagnostics ?? {}),
    },
    parseSummary: {
      candidateCount: pilots.length,
      invalidLineCount: 0,
      duplicateRemovalCount: 0,
      warningCount: 0,
      warnings: [],
      ...(overrides.parseSummary ?? {}),
    },
    pilots,
    ...overrides,
  };
}

function buildState(data: AnalysisSessionView | null): AnalyzeState {
  return {
    status: 'success',
    data,
    errorKey: null,
    message: null,
  };
}

describe('LocalScreen integration', () => {
  it('renders full payload stats with real combat values', () => {
    const data = buildAnalysisData({
      pilots: [
        buildPilot({
          id: 'pilot-a',
          identity: { ...buildPilot().identity, characterId: 7, characterName: 'Ace Hunter' },
          kills: 21,
          losses: 4,
          dangerPercent: 84,
          soloPercent: 42,
          avgGangSize: 3.5,
        }),
      ],
    });

    render(<LocalScreen pastedText="Ace Hunter" analyzeState={buildState(data)} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    const table = screen.getByTestId('threat-table');
    expect(within(table).getByText('Ace Hunter')).toBeInTheDocument();
    expect(within(table).getByText('21')).toBeInTheDocument();
    expect(within(table).getByText('4')).toBeInTheDocument();
    expect(within(table).getByText('HIGH 82')).toBeInTheDocument();
  });

  it('routes warnings to strip/detail/row badge in partial payload', () => {
    const pilotWarning = buildWarning({ code: 'PILOT_PARTIAL', message: 'Pilot has partial killmail timestamps' });
    const globalWarning = buildWarning({ code: 'GLOBAL_TIMESTAMPS', message: '18 timestamps were unavailable', characterId: undefined, characterName: undefined });

    const alpha = buildPilot({ id: 'pilot-alpha', identity: { ...buildPilot().identity, characterId: 11, characterName: 'Alpha Pilot' } });
    const beta = buildPilot({
      id: 'pilot-beta',
      identity: { ...buildPilot().identity, characterId: 12, characterName: 'Beta Pilot' },
      warnings: [pilotWarning],
      notes: 'Beta diagnostics note',
    });

    const data = buildAnalysisData({
      warningCount: 2,
      pilots: [alpha, beta],
      diagnostics: {
        candidateNamesCount: 2,
        resolvedCount: 2,
        unresolvedNames: [],
        invalidLines: 0,
        warnings: [pilotWarning, globalWarning],
        globalWarnings: [globalWarning],
        warningsByPilotId: { [beta.id]: [pilotWarning] },
        warningCodeCounts: { DETAIL_TIME_INVALID: 18 },
        severityCounts: { info: 0, warn: 2, error: 0 },
        providerCounts: { zkill: 2 },
      },
      parseSummary: { candidateCount: 2, invalidLineCount: 0, duplicateRemovalCount: 0, warningCount: 2, warnings: [pilotWarning, globalWarning] },
    });

    render(<LocalScreen pastedText="Alpha\nBeta" analyzeState={buildState(data)} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    expect(screen.getByText(/global warnings: 1/i)).toBeInTheDocument();
    expect(screen.queryByTestId('detail-pane')).not.toHaveTextContent('18 timestamps were unavailable');

    const betaLabel = screen.getByText((_, element) => element?.textContent === '⚠ Beta Pilot');
    fireEvent.click(betaLabel);
    expect(screen.getByTestId('detail-pane')).toHaveTextContent('Pilot has partial killmail timestamps');

    const betaRow = betaLabel.closest('tr');
    const alphaRow = screen.getByText('Alpha Pilot').closest('tr');
    expect(betaRow).toHaveAttribute('data-selected', 'true');
    expect(alphaRow).not.toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('detail-title')).toHaveTextContent('Beta Pilot');
  });

  it('handles empty payload without fake defaults', () => {
    const data = buildAnalysisData({
      pilotCount: 0,
      pilots: [],
      diagnostics: {
        candidateNamesCount: 0,
        resolvedCount: 0,
        unresolvedNames: [],
        invalidLines: 0,
        warnings: [],
        globalWarnings: [],
        warningsByPilotId: {},
        warningCodeCounts: {},
        severityCounts: { info: 0, warn: 0, error: 0 },
        providerCounts: {},
      },
      parseSummary: { candidateCount: 0, invalidLineCount: 0, duplicateRemovalCount: 0, warningCount: 0, warnings: [] },
    });

    render(<LocalScreen pastedText="" analyzeState={buildState(data)} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    expect(screen.getByText(/No pilot selected/i)).toBeInTheDocument();
    expect(screen.getByText(/pilots: 0/i)).toBeInTheDocument();
    expect(screen.queryByText(/^0%$/)).not.toBeInTheDocument();
    expect(screen.queryByText('Unknown ship')).not.toBeInTheDocument();
  });

  it('supports keyboard row selection and enter refresh selected', () => {
    const onRefreshSelected = vi.fn();
    const data = buildAnalysisData({
      pilots: [
        buildPilot({ id: 'pilot-a', identity: { ...buildPilot().identity, characterName: 'Alpha Pilot' } }),
        buildPilot({ id: 'pilot-b', identity: { ...buildPilot().identity, characterId: 2, characterName: 'Bravo Pilot' }, score: 72 }),
      ],
    });

    render(<LocalScreen pastedText="Alpha\nBravo" analyzeState={buildState(data)} onPasteChange={() => {}} onAnalyze={() => {}} onRefreshSelected={onRefreshSelected} useLocalIntelV2Layout />);
    const workspace = screen.getByTestId('local-screen');
    workspace.focus();

    fireEvent.keyDown(workspace, { key: 'ArrowDown' });
    fireEvent.keyDown(workspace, { key: 'Enter' });

    expect(onRefreshSelected).toHaveBeenCalledWith('pilot-b');
  });

  it('keeps warning tiers visible without spamming all rows and defaults to compact mode', () => {
    const partialWarning = buildWarning({ code: 'DETAIL_TIME_INVALID', message: 'Partial timestamps', normalizedLabel: 'Partial timestamps', displayTier: 'row_hint' as const });
    const hiddenWarning = buildWarning({ code: 'DEBUG_ONLY', message: 'Debug warning', normalizedLabel: 'Debug warning', displayTier: 'debug_only' as const });
    const data = buildAnalysisData({
      pilots: [
        buildPilot({ id: 'pilot-1', identity: { ...buildPilot().identity, characterName: 'Warned Pilot' }, warnings: [partialWarning] }),
        buildPilot({ id: 'pilot-2', identity: { ...buildPilot().identity, characterId: 2, characterName: 'Quiet Pilot' }, warnings: [hiddenWarning] }),
      ],
    });

    render(<LocalScreen pastedText="Warned\nQuiet" analyzeState={buildState(data)} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);
    expect(screen.getByTestId('density-toggle')).toHaveTextContent('Comfortable');
    expect(screen.getByText((_, element) => element?.textContent === '⚠ Warned Pilot')).toBeInTheDocument();
    expect(screen.getByLabelText('row warnings')).toHaveAttribute('title', 'Partial timestamps');
    expect(screen.queryByText((_, element) => element?.textContent === '⚠ Quiet Pilot')).not.toBeInTheDocument();
  });

  it('acceptance: avoids zero timestamps and keeps varied non-low score distribution', () => {
    const data = buildAnalysisData({
      pilots: [
        buildPilot({ id: 'pilot-high', identity: { ...buildPilot().identity, characterName: 'High Pilot' }, score: 88, band: 'high', kills: 11, losses: 2, lastKill: '2026-04-10T12:00:00Z' }),
        buildPilot({ id: 'pilot-med', identity: { ...buildPilot().identity, characterId: 3, characterName: 'Medium Pilot' }, score: 55, band: 'medium', kills: 3, losses: 1, lastKill: '' }),
      ],
    });

    render(<LocalScreen pastedText="High\nMedium" analyzeState={buildState(data)} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    expect(screen.queryByText(/0001-01-01/)).not.toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('HIGH 88')).toBeInTheDocument();
    expect(screen.getByText('MED 55')).toBeInTheDocument();
  });
});
