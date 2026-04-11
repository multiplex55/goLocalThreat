import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocalScreen } from '../LocalScreen';
import type { AnalyzeState } from '../analyzeState';

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
        unresolvedNames: [],
        invalidLines: 0,
        warnings: [],
        globalWarnings: [],
        warningsByPilotId: {},
        severityCounts: { info: 0, warn: 0, error: 0 },
        providerCounts: {},
      },
      parseSummary: { candidateCount: 2, invalidLineCount: 0, duplicateRemovalCount: 0, warningCount: 0, warnings: [] },
      pilots: [
        {
          id: '10',
          identity: { characterId: 10, characterName: 'Alpha', corporationName: 'A Corp', corporationTicker: null, allianceName: 'A Alliance', allianceTicker: null, portraitUrl: null, metadata: { corporationId: 1, allianceId: 1 } },
          score: 91,
          band: 'critical',
          confidence: 0.9,
          reasons: ['FC', 'Hunter'],
          tags: ['FC', 'Hunter'],
          notes: 'Alpha note',
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
          identity: { characterId: 11, characterName: 'Beta', corporationName: 'B Corp', corporationTicker: null, allianceName: 'B Alliance', allianceTicker: null, portraitUrl: null, metadata: { corporationId: 2, allianceId: 2 } },
          score: 52,
          band: 'medium',
          confidence: 0.55,
          reasons: ['Stale Data'],
          tags: ['Stale Data'],
          notes: 'Beta note',
          kills: null,
          losses: null,
          dangerPercent: null,
          soloPercent: null,
          avgGangSize: null,
          mainShip: null,
          lastKill: null,
          lastLoss: null,
          freshness: { source: null, dataAsOf: null, isStale: null },
          warnings: [{ code: 'W', message: 'Beta warning', normalizedLabel: 'Beta warning', severity: 'warn', provider: 'zkill', userVisible: true, displayTier: 'detail_panel' }],
        },
      ],
    },
  };
}

describe('PilotDetailPanel selection updates', () => {
  it('updates pane content when selected row changes', () => {
    render(<LocalScreen pastedText="" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    expect(screen.getByTestId('detail-title')).toHaveTextContent('Alpha');
    expect(screen.getByTestId('detail-pane')).toHaveTextContent('Alpha note');

    fireEvent.click(screen.getByText('Beta'));
    expect(screen.getByTestId('detail-title')).toHaveTextContent('Beta');
    expect(screen.getByTestId('detail-pane')).toHaveTextContent('Beta note');
    expect(screen.getByTestId('detail-pane')).toHaveTextContent('Beta warning');
    expect(screen.getByTestId('detail-pane')).toHaveTextContent('Warnings and long-form explanation are intentionally moved here');
    expect(screen.getByTestId('detail-tag-list')).toHaveTextContent('Stale Data');
    expect(screen.getByTestId('detail-tag-rationale')).toHaveTextContent('Stale Data (+30)');
    expect(screen.getByTestId('detail-pane')).not.toHaveTextContent('Alpha note');
  });
});
