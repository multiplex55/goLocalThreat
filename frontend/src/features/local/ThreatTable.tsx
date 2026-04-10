import { buildThreatTableRow } from './ThreatTableRow';
import type { ThreatRowView, ThreatTableOptions } from './types';

export interface ThreatTableView {
  stickyHeader: true;
  rowCount: number;
  rows: ReturnType<typeof buildThreatTableRow>[];
}

function matchFilter(row: ThreatRowView, filterText: string): boolean {
  if (!filterText) return true;
  const haystack = `${row.pilotName} ${row.corp} ${row.alliance} ${row.ship} ${row.tags.join(' ')}`.toLowerCase();
  return haystack.includes(filterText.toLowerCase());
}

export function buildThreatTable(
  rows: ThreatRowView[],
  selectedRowId: string | null,
  settingsCompact: boolean,
  options: ThreatTableOptions = {},
): ThreatTableView {
  const filtered = rows.filter((r) => matchFilter(r, options.filterText ?? ''));
  const sortBy = options.sortBy ?? 'score';
  const direction = options.sortDirection ?? 'desc';

  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortBy];
    const vb = b[sortBy];
    const cmp = va > vb ? 1 : va < vb ? -1 : 0;
    return direction === 'asc' ? cmp : -cmp;
  });

  return {
    stickyHeader: true,
    rowCount: sorted.length,
    rows: sorted.map((row) => buildThreatTableRow(row, row.id === selectedRowId, settingsCompact)),
  };
}
