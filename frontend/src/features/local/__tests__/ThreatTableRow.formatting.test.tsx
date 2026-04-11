import { describe, expect, it } from 'vitest';
import { buildThreatTableRow } from '../ThreatTableRow';
import type { ThreatRowView } from '../types';

const blankRow: ThreatRowView = {
  id: 'pilot-5',
  pilotName: '',
  corp: '',
  alliance: '',
  mainShip: null,
  mainRecentShip: null,
  score: 9,
  threatBand: 'low',
  confidence: 0,
  reasonBreakdown: [],
  kills: null,
  losses: null,
  dangerPercent: null,
  soloPercent: 50.666,
  avgGangSize: 2.333,
  soloGangTendency: 'unknown',
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

describe('ThreatTableRow formatting', () => {
  it('renders unknown values as subtle placeholders', () => {
    const row = buildThreatTableRow(blankRow, false, false);

    expect(row.identity.name).toBe('—');
    expect(row.identity.dimmed).toBe(true);
    expect(row.cells).toEqual(['—', '—', '—', '—', '—']);
    expect(row.numericCells.kills).toBe('—');
    expect(row.numericCells.dangerPercent).toBe('—');
    expect(row.score.badgeText).toBe('LOW 9');
  });

  it('formats percentages and numeric values with compact precision', () => {
    const row = buildThreatTableRow(blankRow, false, false);

    expect(row.numericCells.soloPercent).toBe('50.7%');
    expect(row.numericCells.avgGangSize).toBe('2.3');
  });
});
