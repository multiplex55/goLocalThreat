import { describe, expect, it } from 'vitest';
import { buildThreatTableRow, formatKillLossCompact, formatLastActivity } from '../ThreatTableRow';
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
  it('formats compact K/L values for known, partial, and unknown data', () => {
    expect(formatKillLossCompact(12, 3)).toBe('12/3');
    expect(formatKillLossCompact(7, null)).toBe('7/—');
    expect(formatKillLossCompact(null, null)).toBe('—');
  });

  it('uses latest timestamp for last activity and falls back to placeholder', () => {
    expect(formatLastActivity('2026-04-10T10:00:00Z', '2026-04-01T10:00:00Z')).toBe('2026-04-10T10:00:00Z');
    expect(formatLastActivity('2026-03-10T10:00:00Z', '2026-04-01T10:00:00Z')).toBe('2026-04-01T10:00:00Z');
    expect(formatLastActivity(null, null)).toBe('—');
  });

  it('renders unknown values as subtle placeholders', () => {
    const row = buildThreatTableRow(blankRow, false, false);

    expect(row.identity.name).toBe('—');
    expect(row.identity.dimmed).toBe(true);
    expect(row.cells).toEqual(['—', '—', '—', '—', '—']);
    expect(row.numericCells.kills).toBe('—');
    expect(row.numericCells.dangerPercent).toBe('—');
    expect(row.numericCells.dangerPercent).not.toBe('0%');
    expect(row.numericCells.soloPercent).not.toBe('0%');
    expect(row.score.badgeText).toBe('LOW 9');
  });

  it('formats percentages and numeric values with compact precision', () => {
    const row = buildThreatTableRow(blankRow, false, false);

    expect(row.numericCells.soloPercent).toBe('50.7%');
    expect(row.numericCells.avgGangSize).toBe('2.3');
  });

  it('renders null timestamp values with placeholder dash', () => {
    const row = buildThreatTableRow({ ...blankRow, lastSeen: null }, false, false);
    expect(row.cells[4]).toBe('—');
  });

  it('never surfaces zero sentinel timestamps', () => {
    const row = buildThreatTableRow({ ...blankRow, lastSeen: '0001-01-01T00:00:00Z' }, false, false);
    expect(row.cells[4]).toBe('—');
    expect(row.cells.join(' ')).not.toContain('0001-01-01');
  });

  it('truncates long identity and metadata cells', () => {
    const row = buildThreatTableRow({
      ...blankRow,
      pilotName: 'VeryLongPilotNameThatShouldBeTruncatedForTableCells',
      corp: 'VeryLongCorporationNameThatShouldBeTruncated',
    }, false, false);
    expect(row.identity.name.endsWith('…')).toBe(true);
    expect(row.cells[1].endsWith('…')).toBe(true);
  });
});
