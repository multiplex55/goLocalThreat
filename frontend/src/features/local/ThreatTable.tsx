import { buildThreatTableRow, type ThreatTableRowView as RenderedThreatTableRowView } from './ThreatTableRow';
import type { ThreatRowView, ThreatTableColumn, ThreatTableOptions } from './types';

export interface ThreatTableHeader {
  column: ThreatTableColumn;
  sortable: boolean;
  direction: 'asc' | 'desc' | null;
  visible: boolean;
  align: 'left' | 'right';
  className: string;
}

export interface ThreatTableRowView {
  id: string;
  selected: boolean;
  compact: boolean;
  row: ThreatRowView;
  rendered: RenderedThreatTableRowView;
}

export interface ThreatTableView {
  stickyHeader: true;
  compact: boolean;
  rowCount: number;
  filterText: string;
  headers: ThreatTableHeader[];
  rows: ThreatTableRowView[];
  scrollContainerClassName: string;
  bodyClassName: string;
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
    scrollContainerClassName: 'threat-table-scroll threat-table-scroll--fixed-height',
    bodyClassName: 'threat-table-body threat-table-body--virtualization-ready',
    headers: allColumns.map((column) => ({
      column,
      sortable: sortableColumns.has(column),
      direction: column === sortBy ? direction : null,
      visible: options.visibleColumns?.[column] ?? true,
      align: numericColumns.includes(column) ? 'right' : 'left',
      className: `threat-table-header ${numericColumns.includes(column) ? 'text-right' : 'text-left'} sticky top-0`,
    })),
    rows: sorted.map((row) => {
      const selected = row.id === selectedRowId;
      return {
        id: row.id,
        selected,
        compact: settingsCompact,
        row,
        rendered: buildThreatTableRow(row, selected, settingsCompact),
      };
    }),
  };
}
