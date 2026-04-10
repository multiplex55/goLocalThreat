import { describe, expect, it } from 'vitest';
import { buildThreatTable } from './ThreatTable';
import type { ThreatRowView } from './types';

const rows: ThreatRowView[] = [
  { id: '1', pilotName: 'Zed', corp: 'Corp B', alliance: 'A', mainShip: 'Sabre', score: 20, threatBand: 'low', kills: 1, losses: 2, dangerPercent: 33, soloPercent: 20, avgGangSize: 3, lastKill: '2026-04-09T10:00:00Z', lastLoss: '2026-04-08T10:00:00Z', tags: ['intel'], notes: '', lastSeen: '10:00', status: 'ready' },
  { id: '2', pilotName: 'Amy', corp: 'Corp A', alliance: 'B', mainShip: 'Drake', score: 95, threatBand: 'critical', kills: 10, losses: 1, dangerPercent: 90, soloPercent: 30, avgGangSize: 2.5, lastKill: '2026-04-10T10:00:00Z', lastLoss: '2026-04-07T10:00:00Z', tags: ['hot'], notes: 'fast locker', lastSeen: '10:01', status: 'ready' },
  { id: '3', pilotName: 'Nova', corp: 'Corp C', alliance: 'C', mainShip: 'Vexor', score: 65, threatBand: 'medium', kills: 4, losses: 4, dangerPercent: 50, soloPercent: 5, avgGangSize: 6, lastKill: '2026-04-06T10:00:00Z', lastLoss: '2026-04-10T11:00:00Z', tags: ['watch'], notes: 'possible alt', lastSeen: '10:02', status: 'ready' },
];

describe('ThreatTable', () => {
  it('sorts numeric, text, and date columns', () => {
    const byScore = buildThreatTable(rows, null, false, { sortBy: 'score', sortDirection: 'desc' });
    expect(byScore.rows.map((r) => r.row.pilotName)).toEqual(['Amy', 'Nova', 'Zed']);

    const byPilot = buildThreatTable(rows, null, false, { sortBy: 'pilotName', sortDirection: 'asc' });
    expect(byPilot.rows.map((r) => r.row.pilotName)).toEqual(['Amy', 'Nova', 'Zed']);

    const byLastLoss = buildThreatTable(rows, null, false, { sortBy: 'lastLoss', sortDirection: 'desc' });
    expect(byLastLoss.rows[0]?.row.pilotName).toBe('Nova');
  });

  it('quick filter narrows pilot/corp/alliance/tags', () => {
    expect(buildThreatTable(rows, null, false, { filterText: 'amy' }).rowCount).toBe(1);
    expect(buildThreatTable(rows, null, false, { filterText: 'corp b' }).rowCount).toBe(1);
    expect(buildThreatTable(rows, null, false, { filterText: ' c ' }).rowCount).toBeGreaterThan(0);
    expect(buildThreatTable(rows, null, false, { filterText: 'watch' }).rows[0]?.id).toBe('3');
  });

  it('preserves selected row identity across re-sort', () => {
    const first = buildThreatTable(rows, '2', false, { sortBy: 'pilotName', sortDirection: 'asc' });
    const second = buildThreatTable(rows, first.rows.find((r) => r.selected)?.id ?? null, false, { sortBy: 'kills', sortDirection: 'asc' });
    expect(second.rows.find((r) => r.selected)?.id).toBe('2');
  });
});
