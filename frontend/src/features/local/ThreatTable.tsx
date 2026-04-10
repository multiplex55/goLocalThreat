import type { ThreatRowView, ThreatTableColumn, ThreatTableOptions } from './types';

export interface ThreatTableHeader {
  column: ThreatTableColumn;
  sortable: boolean;
  direction: 'asc' | 'desc' | null;
  visible: boolean;
}

export interface ThreatTableRowView {
  id: string;
  selected: boolean;
  compact: boolean;
  row: ThreatRowView;
}

export interface ThreatTableView {
  stickyHeader: true;
  compact: boolean;
  rowCount: number;
  filterText: string;
  headers: ThreatTableHeader[];
  rows: ThreatTableRowView[];
}

const dateColumns: ThreatTableColumn[] = ['lastKill', 'lastLoss'];
const numericColumns: ThreatTableColumn[] = ['score', 'kills', 'losses', 'dangerPercent', 'soloPercent', 'avgGangSize'];
const sortableColumns = new Set<ThreatTableColumn>([
  'pilotName', 'corp', 'alliance', 'score', 'threatBand', 'kills', 'losses', 'dangerPercent', 'soloPercent', 'avgGangSize', 'lastKill', 'lastLoss', 'mainShip',
]);
const allColumns: ThreatTableColumn[] = ['pilotName', 'corp', 'alliance', 'score', 'threatBand', 'kills', 'losses', 'dangerPercent', 'soloPercent', 'avgGangSize', 'lastKill', 'lastLoss', 'mainShip', 'tags', 'notes'];

function matchFilter(row: ThreatRowView, filterText: string): boolean {
  if (!filterText) return true;
  const haystack = `${row.pilotName} ${row.corp} ${row.alliance} ${row.tags.join(' ')}`.toLowerCase();
  return haystack.includes(filterText.toLowerCase());
}

function compareByColumn(a: ThreatRowView, b: ThreatRowView, column: ThreatTableColumn): number {
  if (numericColumns.includes(column)) {
    return Number(a[column]) - Number(b[column]);
  }
  if (dateColumns.includes(column)) {
    return Date.parse(String(a[column])) - Date.parse(String(b[column]));
  }
  return String(a[column]).localeCompare(String(b[column]));
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
    const cmp = compareByColumn(a, b, sortBy);
    return direction === 'asc' ? cmp : -cmp;
  });

  return {
    stickyHeader: true,
    compact: settingsCompact,
    rowCount: sorted.length,
    filterText: options.filterText ?? '',
    headers: allColumns.map((column) => ({
      column,
      sortable: sortableColumns.has(column),
      direction: column === sortBy ? direction : null,
      visible: options.visibleColumns?.[column] ?? true,
    })),
    rows: sorted.map((row) => ({ id: row.id, selected: row.id === selectedRowId, compact: settingsCompact, row })),
  };
}
