import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocalScreen } from './LocalScreen';
import type { AnalyzeState } from './analyzeState';

function buildState(): AnalyzeState {
  return {
    status: 'success', errorKey: null, message: null,
    data: {
      sessionId: 's1', createdAt: '2026-01-01T00:00:00Z', pilotCount: 2, warningCount: 1, sourceTextLength: 10,
      diagnostics: { candidateNamesCount: 2, resolvedCount: 1, unresolvedNames: ['Gamma'], invalidLines: 0, warnings: [], globalWarnings: [], warningsByPilotId: {}, severityCounts: { info: 0, warn: 0, error: 0 }, providerCounts: {}, warningCodeCounts: {}, detailCoverage: { detailRequested: 2, detailFetched: 1, policySummary: 'test policy' } },
      parseSummary: { candidateCount: 2, invalidLineCount: 0, duplicateRemovalCount: 0, warningCount: 1, warnings: [{ code: 'W_PARSE', message: 'Trimmed weird line', severity: 'warn', userVisible: true, category: 'parse' }] },
      pilots: [
        { id: '10', identity: { characterId: 10, characterName: 'Alpha', corporationName: 'A Corp', corporationTicker: null, allianceName: 'A', allianceTicker: null, portraitUrl: null, metadata: { corporationId: 1, allianceId: 1 } }, score: 91, band: 'critical', confidence: 0.9, reasons: ['FC'], tags: ['FC'], notes: null, kills: 7, losses: 1, dangerPercent: 80, soloPercent: 50, avgGangSize: 3, mainShip: 'Sabre', lastKill: '2026-01-01T00:00:00Z', lastLoss: '2025-12-01T00:00:00Z', freshness: { source: 'zkill', dataAsOf: '2026-01-01T00:00:00Z', isStale: false }, detailRequested: true, detailFetched: true, warnings: [] },
        { id: '11', identity: { characterId: 11, characterName: 'Beta', corporationName: 'B Corp', corporationTicker: null, allianceName: 'B', allianceTicker: null, portraitUrl: null, metadata: { corporationId: 2, allianceId: 2 } }, score: 52, band: 'medium', confidence: 0.55, reasons: ['Stale Data'], tags: ['Stale Data'], notes: null, kills: null, losses: null, dangerPercent: null, soloPercent: null, avgGangSize: null, mainShip: null, lastKill: null, lastLoss: null, freshness: { source: null, dataAsOf: null, isStale: null }, detailRequested: true, detailFetched: false, warnings: [] },
      ],
    },
  };
}

describe('LocalScreen', () => {
  it('renders top intake drawer and compact toolbar controls', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);
    expect(screen.getByTestId('roster-intake-drawer')).toBeInTheDocument();
    expect(screen.getByTestId('local-center-controls')).toBeInTheDocument();
    expect(screen.getByTestId('local-right-panel')).toBeInTheDocument();
    expect(screen.getByTestId('local-bottom-strip')).toBeInTheDocument();
    expect(screen.getByTestId('detail-status-chip')).toHaveTextContent('detail 1/2');
  });

  it('drawer expands and collapses showing parse details', () => {
    render(<LocalScreen pastedText="pilot a" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);
    expect(screen.queryByTestId('roster-drawer-expanded')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('roster-toggle'));
    expect(screen.getByTestId('roster-drawer-expanded')).toBeInTheDocument();
    expect(screen.getByTestId('parse-summary')).toHaveTextContent('Parsed 2 · resolved 1 · unresolved 1');
    expect(screen.getByTestId('parse-warnings-list')).toHaveTextContent('Trimmed weird line');
    fireEvent.click(screen.getByTestId('roster-toggle'));
    expect(screen.queryByTestId('roster-drawer-expanded')).not.toBeInTheDocument();
  });

  it('analyze action auto-collapses drawer when enabled', () => {
    const onAnalyze = vi.fn();
    render(<LocalScreen pastedText="pilot" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={onAnalyze} useLocalIntelV2Layout />);
    fireEvent.click(screen.getByTestId('roster-toggle'));
    expect(screen.getByTestId('roster-drawer-expanded')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));
    expect(onAnalyze).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('roster-drawer-expanded')).not.toBeInTheDocument();
    expect(screen.getByTestId('roster-summary-chip')).toHaveTextContent('Roster · 2 parsed · 1 resolved');
  });

  it('toolbar actions still work', () => {
    const onRefreshSelected = vi.fn();
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} onRefreshSelected={onRefreshSelected} useLocalIntelV2Layout />);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Selected' }));
    expect(onRefreshSelected).toHaveBeenCalledWith('10');
  });

  it('uses backend detail coverage metadata when stats exist for all but detail is subset', () => {
    const state = buildState();
    state.data!.diagnostics.detailCoverage = { detailRequested: 2, detailFetched: 1, policySummary: 'top-N + bootstrap' };
    state.data!.pilots[1]!.kills = 4; // stats present, but backend still reports summary-only detail coverage.
    render(<LocalScreen pastedText="" analyzeState={state} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);
    expect(screen.getByTestId('detail-status-chip')).toHaveTextContent('detail 1/2');
  });
});
