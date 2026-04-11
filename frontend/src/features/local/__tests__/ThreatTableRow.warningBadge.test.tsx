import { describe, expect, it } from 'vitest';
import { buildThreatTableRow } from '../ThreatTableRow';
import type { ThreatRowView } from '../types';

const baseRow: ThreatRowView = {
  id: 'pilot-10',
  pilotName: 'Pilot',
  corp: 'Corp',
  alliance: 'Alliance',
  mainShip: null,
  mainRecentShip: null,
  score: 10,
  threatBand: 'low',
  confidence: 1,
  reasonBreakdown: [],
  kills: 1,
  losses: 0,
  dangerPercent: 10,
  soloPercent: 10,
  avgGangSize: 2,
  soloGangTendency: 'Balanced',
  lastKill: null,
  lastLoss: null,
  lastActivitySummary: '',
  freshness: null,
  tags: [],
  notes: '',
  lastSeen: null,
  status: 'ready',
  dataCompletenessMarkers: [],
};

describe('ThreatTableRow warning badge', () => {
  it('shows active indicator for warn/error visible warnings', () => {
    const row = buildThreatTableRow({ ...baseRow, warnings: [{ message: 'warn', severity: 'warn', userVisible: true }] }, false, false);
    expect(row.warningIcon).toBe('⚠️');
    expect(row.warningIndicator).toBe('active');
    expect(row.warningBadgeText).toBe('⚠');
  });

  it('shows muted indicator for info/hidden warnings', () => {
    const row = buildThreatTableRow({ ...baseRow, warnings: [{ message: 'info', severity: 'info', userVisible: false }] }, false, false);
    expect(row.warningIcon).toBeNull();
    expect(row.warningIndicator).toBe('muted');
    expect(row.warningBadgeText).toBe('•');
  });
});
