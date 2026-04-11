import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocalScreen } from '../LocalScreen';
import type { AnalyzeState } from '../analyzeState';

function buildState(): AnalyzeState {
  return {
    status: 'success', errorKey: null, message: null,
    data: {
      sessionId: 'layout-s1', createdAt: '2026-01-01T00:00:00Z', pilotCount: 1, warningCount: 0, sourceTextLength: 10,
      diagnostics: { candidateNamesCount: 1, resolvedCount: 1, unresolvedNames: [], invalidLines: 0, warnings: [], globalWarnings: [], warningsByPilotId: {}, severityCounts: { info: 0, warn: 0, error: 0 }, providerCounts: {} },
      parseSummary: { candidateCount: 1, invalidLineCount: 0, duplicateRemovalCount: 0, warningCount: 0, warnings: [] },
      pilots: [{ id: '1', identity: { characterId: 1, characterName: 'Pilot 1', corporationName: 'Corp', corporationTicker: null, allianceName: 'Alliance', allianceTicker: null, portraitUrl: null, metadata: { corporationId: 1, allianceId: 1 } }, score: 50, band: 'medium', confidence: 0.8, reasons: ['Test'], tags: [], notes: null, kills: null, losses: null, dangerPercent: null, soloPercent: null, avgGangSize: null, mainShip: null, lastKill: null, lastLoss: null, freshness: { source: null, dataAsOf: null, isStale: null }, warnings: [] }],
    },
  };
}

describe('LocalScreen layout regions', () => {
  it('keeps center grid and diagnostics strip mounted', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);
    expect(screen.getByTestId('local-layout-grid')).toHaveAttribute('data-layout-mode', 'desktop');
    expect(screen.getByTestId('local-bottom-strip')).toBeInTheDocument();
  });
});
