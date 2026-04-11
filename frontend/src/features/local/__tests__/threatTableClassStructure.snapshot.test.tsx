import { describe, expect, it } from 'vitest';
import { buildThreatTable } from '../ThreatTable';
import type { ThreatRowView } from '../types';

const row: ThreatRowView = {
  id: 'snap-1',
  pilotName: 'Snap',
  corp: '',
  alliance: 'Alliance',
  mainShip: 'Caracal',
  mainRecentShip: 'Caracal',
  score: 77,
  threatBand: 'high',
  confidence: 0.8,
  reasonBreakdown: [],
  kills: 4,
  losses: 2,
  dangerPercent: 62,
  soloPercent: 15,
  avgGangSize: 4,
  soloGangTendency: 'High Gang',
  lastKill: null,
  lastLoss: null,
  lastActivitySummary: '—',
  freshness: 'fresh',
  tags: ['FC', 'Scout', 'Cyno', 'Logi'],
  notes: '',
  lastSeen: null,
  status: 'ready',
  dataCompletenessMarkers: [],
};

describe('threat table class structure snapshot', () => {
  it('keeps sticky and compact class hooks stable', () => {
    const table = buildThreatTable([row], 'snap-1', true);

    expect({
      stickyHeader: table.stickyHeader,
      scrollContainerClassName: table.scrollContainerClassName,
      bodyClassName: table.bodyClassName,
      headerClassName: table.headers[0]?.className,
      row: table.rows[0]?.rendered,
    }).toMatchSnapshot();
  });
});
