import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
      pilotCount: 1,
      warningCount: 0,
      sourceTextLength: 1,
      diagnostics: {
        candidateNamesCount: 1,
        resolvedCount: 1,
        unresolvedNames: [],
        invalidLines: 0,
        warnings: [],
        globalWarnings: [],
        warningsByPilotId: {},
        severityCounts: { info: 0, warn: 0, error: 0 },
        providerCounts: {},
      },
      parseSummary: { candidateCount: 1, invalidLineCount: 0, duplicateRemovalCount: 0, warningCount: 0, warnings: [] },
      pilots: [{
        id: '1',
        identity: { characterId: 1, characterName: 'Mapped Pilot', corporationName: 'Mapped Corp', corporationTicker: null, allianceName: 'Mapped Alliance', allianceTicker: null, portraitUrl: null, metadata: { corporationId: 1, allianceId: 1 } },
        score: 80,
        band: 'high',
        confidence: 0.9,
        reasons: ['Hunter'],
        tags: ['Hunter'],
        notes: 'mapped notes',
        kills: 12,
        losses: 3,
        dangerPercent: 66,
        soloPercent: 44,
        avgGangSize: 2,
        mainShip: 'Orthrus',
        lastKill: '2026-01-01T00:00:00Z',
        lastLoss: '2025-12-01T00:00:00Z',
        freshness: { source: 'zkill', dataAsOf: '2026-01-01T00:00:00Z', isStale: false },
        warnings: [],
      }],
    },
  };
}

describe('LocalScreen mapping', () => {
  it('renders rows from adapted values directly', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);
    expect(screen.getAllByText('Mapped Pilot').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Orthrus').length).toBeGreaterThan(0);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('does not inject hardcoded Unknown ship/zero defaults', () => {
    const state = buildState();
    state.data!.pilots[0]!.mainShip = null;
    state.data!.pilots[0]!.kills = null;
    render(<LocalScreen pastedText="" analyzeState={state} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);
    expect(screen.queryByText('Unknown ship')).not.toBeInTheDocument();
    expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
