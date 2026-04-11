import { describe, expect, it } from 'vitest';
import { buildThreatTable } from '../ThreatTable';
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

describe('ThreatTable render model', () => {
  it('provides sticky header and fixed-height scroll container hooks', () => {
    const table = buildThreatTable([baseRow], null, true);

    expect(table.stickyHeader).toBe(true);
    expect(table.scrollContainerClassName).toContain('fixed-height');
    expect(table.headers[0]?.className).toContain('sticky');
    expect(table.bodyClassName).toContain('virtualization-ready');
  });

  it('adapts score badge and tag chips for row rendering', () => {
    const table = buildThreatTable([baseRow], null, false);
    const first = table.rows[0]!.rendered;

    expect(first.score.badgeText).toBe('HIGH 81');
    expect(first.tagCell.visible.map((tag) => tag.label)).toEqual(['FC', 'Cloaky', 'Hotdrop']);
    expect(first.tagCell.overflowCount).toBe(1);
    expect(first.tagCell.overflowTooltip).toContain('Scout');
  });
});
