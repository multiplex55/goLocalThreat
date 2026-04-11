import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocalScreen } from './LocalScreen';
import type { AnalyzeState } from './analyzeState';

function buildState(): AnalyzeState {
  return {
    status: 'success', errorKey: null, message: null,
    data: {
      sessionId: 's1', createdAt: '2026-01-01T00:00:00Z', pilotCount: 2, warningCount: 0, sourceTextLength: 10,
      diagnostics: { candidateNamesCount: 2, resolvedCount: 2, unresolvedNames: [], invalidLines: 0, warnings: [], globalWarnings: [], warningsByPilotId: {}, severityCounts: { info: 0, warn: 0, error: 0 }, providerCounts: {} },
      parseSummary: { candidateCount: 2, invalidLineCount: 0, duplicateRemovalCount: 0, warningCount: 0, warnings: [] },
      pilots: [
        { id: '10', identity: { characterId: 10, characterName: 'Alpha', corporationName: 'A Corp', corporationTicker: null, allianceName: 'A', allianceTicker: null, portraitUrl: null, metadata: { corporationId: 1, allianceId: 1 } }, score: 91, band: 'critical', confidence: 0.9, reasons: ['FC'], tags: ['FC'], notes: null, kills: 7, losses: 1, dangerPercent: 80, soloPercent: 50, avgGangSize: 3, mainShip: 'Sabre', lastKill: '2026-01-01T00:00:00Z', lastLoss: '2025-12-01T00:00:00Z', freshness: { source: 'zkill', dataAsOf: '2026-01-01T00:00:00Z', isStale: false }, warnings: [] },
        { id: '11', identity: { characterId: 11, characterName: 'Beta', corporationName: 'B Corp', corporationTicker: null, allianceName: 'B', allianceTicker: null, portraitUrl: null, metadata: { corporationId: 2, allianceId: 2 } }, score: 52, band: 'medium', confidence: 0.55, reasons: ['Stale Data'], tags: ['Stale Data'], notes: null, kills: null, losses: null, dangerPercent: null, soloPercent: null, avgGangSize: null, mainShip: null, lastKill: null, lastLoss: null, freshness: { source: null, dataAsOf: null, isStale: null }, warnings: [] },
      ],
    },
  };
}

describe('LocalScreen', () => {
  it('renders layout regions and compact controls', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);
    expect(screen.getByTestId('local-left-panel')).toBeInTheDocument();
    expect(screen.getByTestId('local-center-controls')).toBeInTheDocument();
    expect(screen.getByTestId('local-right-panel')).toBeInTheDocument();
    expect(screen.getByTestId('local-bottom-strip')).toBeInTheDocument();
    expect(screen.queryByTestId('column-toggles')).not.toBeInTheDocument();
  });

  it('keyboard Enter triggers analyze callback', () => {
    const onAnalyze = vi.fn();
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={onAnalyze} useLocalIntelV2Layout />);
    const root = screen.getByTestId('local-screen');
    fireEvent.keyDown(root, { key: 'Enter' });
    expect(onAnalyze).toHaveBeenCalledTimes(1);
  });

  it('toolbar actions still work', () => {
    const onRefreshSelected = vi.fn();
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} onRefreshSelected={onRefreshSelected} useLocalIntelV2Layout />);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Selected' }));
    expect(onRefreshSelected).toHaveBeenCalledWith('10');
  });
});
