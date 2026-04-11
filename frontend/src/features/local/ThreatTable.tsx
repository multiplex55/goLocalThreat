import { useEffect, useMemo, type CSSProperties, type RefObject } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
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

const col = createColumnHelper<ThreatRowView>();

const compactColumnDefs: ColumnDef<ThreatRowView, any>[] = [
  col.accessor('pilotName', { header: 'pilotName', cell: (ctx) => ctx.getValue() }),
  col.accessor('corp', { header: 'corp', cell: (ctx) => ctx.getValue() }),
  col.accessor('alliance', { header: 'alliance', cell: (ctx) => ctx.getValue() }),
  col.accessor('score', { header: 'score' }),
  col.accessor('threatBand', { header: 'threatBand' }),
  col.accessor('kills', { header: 'kills' }),
  col.accessor('losses', { header: 'losses' }),
  col.accessor('dangerPercent', { header: 'dangerPercent' }),
  col.accessor('soloPercent', { header: 'soloPercent' }),
  col.accessor('avgGangSize', { header: 'avgGangSize' }),
  col.accessor('lastKill', { header: 'lastKill' }),
  col.accessor('lastLoss', { header: 'lastLoss' }),
  col.accessor('mainShip', { header: 'mainShip' }),
  col.accessor('tags', { header: 'tags' }),
  col.accessor('notes', { header: 'notes' }),
];

function normalizeValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

interface VirtualThreatTableProps {
  rows: ThreatRowView[];
  selectedRowId: string | null;
  compactMode: boolean;
  sortBy: ThreatTableColumn;
  sortDirection: 'asc' | 'desc';
  filterText: string;
  visibleColumns: Record<ThreatTableColumn, boolean>;
  onRowSelect: (rowId: string) => void;
  onRowTogglePin: (rowId: string) => void;
  onSortChange: (column: ThreatTableColumn) => void;
  isPinned: (rowId: string) => boolean;
  scrollParentRef: RefObject<HTMLDivElement>;
  onVisibleRowIdsChange?: (rowIds: string[]) => void;
}

export function VirtualThreatTable({
  rows,
  selectedRowId,
  compactMode,
  sortBy,
  sortDirection,
  filterText,
  visibleColumns,
  onRowSelect,
  onRowTogglePin,
  onSortChange,
  isPinned,
  scrollParentRef,
  onVisibleRowIdsChange,
}: VirtualThreatTableProps) {
  const sorting = useMemo<SortingState>(() => [{ id: sortBy, desc: sortDirection === 'desc' }], [sortBy, sortDirection]);
  const columnVisibility = useMemo<VisibilityState>(() => ({ ...visibleColumns }), [visibleColumns]);

  const table = useReactTable({
    data: rows,
    columns: compactColumnDefs,
    state: {
      sorting,
      globalFilter: filterText,
      columnVisibility,
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue ?? '').trim().toLowerCase();
      if (!query) return true;
      const value = `${row.original.pilotName} ${row.original.corp} ${row.original.alliance} ${row.original.tags.join(' ')}`.toLowerCase();
      return value.includes(query);
    },
  });

  const bodyRows = table.getRowModel().rows;
  useEffect(() => {
    onVisibleRowIdsChange?.(bodyRows.map((row) => row.original.id));
  }, [bodyRows, onVisibleRowIdsChange]);

  const virtualizer = useVirtualizer({
    count: bodyRows.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => (compactMode ? 30 : 36),
    overscan: 8,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const fallbackItems = bodyRows.map((_, index) => ({ index, start: index * (compactMode ? 30 : 36) }));
  const activeItems = virtualItems.length ? virtualItems : fallbackItems;
  const totalSize = virtualItems.length ? virtualizer.getTotalSize() : fallbackItems.length * (compactMode ? 30 : 36);

  return (
    <div className="threat-table-shell" data-testid="threat-table-shell">
      <table className="threat-table-head" aria-hidden="true">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id}>
                  <button type="button" onClick={() => onSortChange(header.column.id as ThreatTableColumn)}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.id === sortBy ? (sortDirection === 'asc' ? ' (asc)' : ' (desc)') : ''}
                  </button>
                </th>
              ))}
            </tr>
          ))}
        </thead>
      </table>

      <div className="local-center-table-scroll" data-testid="local-center-table-scroll" ref={scrollParentRef}>
        <table data-testid="threat-table" aria-label="Threat rows">
          <tbody style={{ display: 'grid', height: `${totalSize}px`, position: 'relative' }}>
            {activeItems.map((virtualRow) => {
              const row = bodyRows[virtualRow.index];
              if (!row) return null;
              const rendered = buildThreatTableRow(row.original, row.original.id === selectedRowId, compactMode);
              const rowStyle: CSSProperties = {
                display: 'flex',
                position: 'absolute',
                transform: `translateY(${virtualRow.start}px)`,
                width: '100%',
              };

              return (
                <tr
                  key={row.id}
                  style={rowStyle}
                  className={rendered.rowClassName}
                  data-selected={row.original.id === selectedRowId || undefined}
                  data-band={row.original.threatBand}
                  tabIndex={0}
                  onClick={() => onRowSelect(row.original.id)}
                  onDoubleClick={() => onRowTogglePin(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {cell.column.id === 'pilotName' ? (
                        <>
                          {isPinned(row.original.id) ? '📌 ' : ''}
                          {rendered.warningBadgeText ? (
                            <span
                              title={row.original.warnings?.filter((warning) => warning.displayTier === 'row_hint').map((warning) => warning.normalizedLabel ?? warning.message).slice(0, 2).join(', ') || 'Row warning'}
                              aria-label="row warnings"
                            >
                              {rendered.warningBadgeText}{' '}
                            </span>
                          ) : null}
                          {normalizeValue(cell.getValue())}
                        </>
                      ) : normalizeValue(cell.getValue())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
