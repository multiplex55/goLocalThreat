import { describe, expect, it } from 'vitest';
import { buildThreatTableRow } from '../ThreatTableRow';
import type { ThreatRowView } from '../types';

function makeRow(overrides: Partial<ThreatRowView> = {}): ThreatRowView {
  return {
    id: 'pilot-2',
    pilotName: 'Shade',
    corp: 'Ghost Corp',
    alliance: 'Phantom',
    mainShip: 'Rapier',
    mainRecentShip: 'Rapier',
    score: 55,
    threatBand: 'medium',
    confidence: 0.5,
    reasonBreakdown: [],
    kills: 2,
    losses: 1,
    dangerPercent: 47,
    soloPercent: 14,
    avgGangSize: 4,
    soloGangTendency: 'gang',
    lastKill: null,
    lastLoss: null,
    lastActivitySummary: '',
    freshness: null,
    tags: ['FC'],
    notes: '',
    lastSeen: null,
    status: 'ready',
    dataCompletenessMarkers: [],
    ...overrides,
  };
}

describe('ThreatTableRow interaction states', () => {
  it('applies hover and selected class states', () => {
    const selected = buildThreatTableRow(makeRow(), true, false);
    const unselected = buildThreatTableRow(makeRow({ id: 'pilot-3' }), false, true);

    expect(selected.rowClassName).toContain('is-hoverable');
    expect(selected.rowClassName).toContain('is-selected');
    expect(unselected.rowClassName).toContain('is-compact');
    expect(unselected.rowClassName).not.toContain('is-selected');
  });

  it('shows warning icon only for warning-bearing pilots', () => {
    const warningRow = buildThreatTableRow(makeRow({ warnings: [{ message: 'Potential bait', severity: 'warn', userVisible: true }] }), false, false);
    const cleanRow = buildThreatTableRow(makeRow({ id: 'pilot-4', warnings: [{ message: 'FYI', severity: 'info', userVisible: true }] }), false, false);

    expect(warningRow.warningIcon).toBe('⚠️');
    expect(cleanRow.warningIcon).toBeNull();
  });
});
