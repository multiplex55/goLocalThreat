import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { buildThreatTable } from '../ThreatTable';
import { LocalScreen } from '../LocalScreen';
import type { AnalyzeState } from '../analyzeState';
import type { ThreatRowView } from '../types';

const baseRow: ThreatRowView = {
  id: 'pilot-1',
  pilotName: 'Cipher',
  corp: 'Nova Corp',
  corpTicker: 'NOVA',
  alliance: 'Dark Tide',
  allianceTicker: 'TIDE',
  orgMetadataPartial: false,
  mainShip: 'Loki',
  mainRecentShip: 'Loki',
  score: 81,
  threatBand: 'high',
  confidence: 0.9,
  reasonBreakdown: [],
  kills: 8,
  losses: 2,
  dangerPercent: 64.2,
  soloPercent: 22,
  avgGangSize: 3.7,
  soloGangTendency: 'mixed',
  lastKill: '2026-04-10T10:00:00Z',
  lastLoss: '2026-04-01T10:00:00Z',
  lastActivitySummary: '10m ago',
  freshness: 'fresh',
  tags: ['FC', 'Cloaky', 'Hotdrop', 'Scout'],
  notes: '',
  lastSeen: '10:10',
  status: 'ready',
  dataCompletenessMarkers: [],
};

function buildAnalyzeState(): AnalyzeState {
  return {
    status: 'success',
    errorKey: null,
    message: null,
    data: {
      sessionId: 'table-render',
      createdAt: '2026-01-01T00:00:00Z',
      pilotCount: 1,
      warningCount: 0,
      sourceTextLength: 6,
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
      parseSummary: {
        candidateCount: 1,
        invalidLineCount: 0,
        duplicateRemovalCount: 0,
        warningCount: 0,
        warnings: [],
      },
      pilots: [{
        id: 'pilot-1',
        identity: {
          characterId: 101,
          characterName: 'Cipher',
          corporationName: 'Nova Corp',
          corporationTicker: 'NOVA',
          allianceName: 'Dark Tide',
          allianceTicker: 'TIDE',
          portraitUrl: null,
          metadata: { corporationId: 10, allianceId: 20 },
        },
        score: 81,
        band: 'high',
        confidence: 0.9,
        reasons: ['Test'],
        tags: ['FC'],
        notes: '',
        kills: 8,
        losses: 2,
        dangerPercent: 64.2,
        soloPercent: 22,
        avgGangSize: 3.7,
        mainShip: 'Loki',
        lastKill: '2026-04-10T10:00:00Z',
        lastLoss: '2026-04-01T10:00:00Z',
        freshness: { source: null, dataAsOf: null, isStale: false },
        warnings: [],
      }],
    },
  };
}

describe('ThreatTable render model', () => {
  it('provides sticky header and fixed-height scroll container hooks', () => {
    const table = buildThreatTable([baseRow], null, true);

    expect(table.stickyHeader).toBe(true);
    expect(table.scrollContainerClassName).toContain('fixed-height');
    expect(table.headers[0]?.className).toContain('sticky');
    expect(table.bodyClassName).toContain('virtualization-ready');
  });

  it('keeps table mounted inside center panel scroll wrapper', () => {
    render(<LocalScreen pastedText="" analyzeState={buildAnalyzeState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    const centerPanel = screen.getByTestId('local-center-panel');
    const scroll = within(centerPanel).getByTestId('local-center-table-scroll');
    const tableEl = within(centerPanel).getByTestId('threat-table');

    expect(scroll.className).toContain('local-center-table-scroll');
    expect(scroll.className).toContain('threat-table-scroll--fixed-height');
    expect(scroll.contains(tableEl)).toBe(true);
  });

  it('adapts score badge and tag chips for row rendering', () => {
    const table = buildThreatTable([baseRow], null, false);
    const first = table.rows[0]!.rendered;

    expect(first.score.badgeText).toBe('HIGH 81');
    expect(first.tagCell.visible.map((tag) => tag.label)).toEqual(['FC', 'Cloaky']);
    expect(first.tagCell.overflowCount).toBe(1);
    expect(first.tagCell.overflowTooltip).toContain('Active');
  });

  it('renders unknown metrics as em dash without synthetic zero values', () => {
    const rowWithUnknowns: ThreatRowView = {
      ...baseRow,
      mainShip: null,
      dangerPercent: null,
      soloPercent: null,
      avgGangSize: null,
      lastSeen: null,
    };
    const table = buildThreatTable([rowWithUnknowns], null, false);
    const first = table.rows[0]!.rendered;

    expect(first.cells[3]).toBe('—');
    expect(first.cells[4]).toBe('—');
    expect(first.numericCells.dangerPercent).toBe('—');
    expect(first.numericCells.soloPercent).toBe('—');
    expect(Object.values(first.numericCells)).not.toContain('0%');
  });
});
