import { describe, expect, it } from 'vitest';
import { buildThreatTable } from './ThreatTable';
import type { ThreatRowView } from './types';

const rows: ThreatRowView[] = [
  { id: '1', pilotName: 'Zed', corp: 'Corp B', alliance: 'A', ship: 'Sabre', score: 20, level: 'low', tags: ['intel'], lastSeen: '10:00', status: 'ready' },
  { id: '2', pilotName: 'Amy', corp: 'Corp A', alliance: 'B', ship: 'Drake', score: 95, level: 'critical', tags: ['hot'], lastSeen: '10:01', status: 'ready' },
  { id: '3', pilotName: 'Nova', corp: 'Corp C', alliance: 'C', ship: 'Vexor', score: 65, level: 'medium', tags: ['watch'], lastSeen: '10:02', status: 'ready' },
];

describe('ThreatTable', () => {
  it('renders rows and sticky header', () => {
    const table = buildThreatTable(rows, '2', false);
    expect(table.rowCount).toBe(3);
    expect(table.stickyHeader).toBe(true);
  });

  it('sorts rows by configured key and direction', () => {
    const byNameAsc = buildThreatTable(rows, null, false, { sortBy: 'pilotName', sortDirection: 'asc' });
    expect(byNameAsc.rows.map((r) => r.cells[0])).toEqual(['Amy', 'Nova', 'Zed']);
  });

  it('filters rows by text match', () => {
    const filtered = buildThreatTable(rows, null, false, { filterText: 'drake' });
    expect(filtered.rowCount).toBe(1);
    expect(filtered.rows[0].cells[0]).toBe('Amy');
  });
});
