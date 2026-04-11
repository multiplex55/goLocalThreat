import { useEffect, useMemo, type CSSProperties, type RefObject } from 'react';
import { buildThreatTableRow, formatKillLossCompact, formatLastActivity, type ThreatTableRowView as RenderedThreatTableRowView } from './ThreatTableRow';
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

type ColumnAlign = 'left' | 'right';
type ColumnRenderKind = 'identity' | 'text' | 'number' | 'percent' | 'date' | 'tags' | 'notes' | 'threatBand' | 'killLoss' | 'lastActivity';

export interface ThreatTableColumnSchema {
  key: ThreatTableColumn;
  label: string;
  width: number;
  minWidth: number;
  maxWidth: number;
  align: ColumnAlign;
  visibleByDefault: boolean;
  truncate: boolean;
  sortable: boolean;
  renderKind: ColumnRenderKind;
}

export const THREAT_TABLE_COLUMN_SCHEMA: ThreatTableColumnSchema[] = [
  { key: 'pilotName', label: 'Pilot', width: 220, minWidth: 180, maxWidth: 320, align: 'left', visibleByDefault: true, truncate: true, sortable: true, renderKind: 'identity' },
  { key: 'corp', label: 'Corp', width: 180, minWidth: 140, maxWidth: 260, align: 'left', visibleByDefault: true, truncate: true, sortable: true, renderKind: 'text' },
  { key: 'alliance', label: 'Alliance', width: 180, minWidth: 140, maxWidth: 260, align: 'left', visibleByDefault: true, truncate: true, sortable: true, renderKind: 'text' },
  { key: 'score', label: 'Score', width: 108, minWidth: 88, maxWidth: 132, align: 'right', visibleByDefault: true, truncate: false, sortable: true, renderKind: 'number' },
  { key: 'threatBand', label: 'Band', width: 112, minWidth: 92, maxWidth: 136, align: 'left', visibleByDefault: true, truncate: false, sortable: true, renderKind: 'threatBand' },
  { key: 'kl', label: 'K/L', width: 88, minWidth: 76, maxWidth: 120, align: 'right', visibleByDefault: true, truncate: false, sortable: true, renderKind: 'killLoss' },
  { key: 'kills', label: 'Kills', width: 84, minWidth: 72, maxWidth: 108, align: 'right', visibleByDefault: false, truncate: false, sortable: true, renderKind: 'number' },
  { key: 'losses', label: 'Losses', width: 84, minWidth: 72, maxWidth: 108, align: 'right', visibleByDefault: false, truncate: false, sortable: true, renderKind: 'number' },
  { key: 'dangerPercent', label: 'Danger', width: 108, minWidth: 90, maxWidth: 132, align: 'right', visibleByDefault: true, truncate: false, sortable: true, renderKind: 'percent' },
  { key: 'soloPercent', label: 'Solo %', width: 108, minWidth: 90, maxWidth: 132, align: 'right', visibleByDefault: false, truncate: false, sortable: true, renderKind: 'percent' },
  { key: 'avgGangSize', label: 'Avg Gang', width: 108, minWidth: 90, maxWidth: 132, align: 'right', visibleByDefault: false, truncate: false, sortable: true, renderKind: 'number' },
  { key: 'lastActivity', label: 'Last activity', width: 180, minWidth: 140, maxWidth: 240, align: 'left', visibleByDefault: true, truncate: true, sortable: true, renderKind: 'lastActivity' },
  { key: 'lastKill', label: 'Last Kill', width: 180, minWidth: 140, maxWidth: 240, align: 'left', visibleByDefault: false, truncate: true, sortable: true, renderKind: 'date' },
  { key: 'lastLoss', label: 'Last Loss', width: 180, minWidth: 140, maxWidth: 240, align: 'left', visibleByDefault: false, truncate: true, sortable: true, renderKind: 'date' },
  { key: 'mainShip', label: 'Main ship', width: 160, minWidth: 120, maxWidth: 220, align: 'left', visibleByDefault: true, truncate: true, sortable: true, renderKind: 'text' },
  { key: 'tags', label: 'Tags', width: 188, minWidth: 148, maxWidth: 260, align: 'left', visibleByDefault: true, truncate: true, sortable: false, renderKind: 'tags' },
  { key: 'notes', label: 'Notes', width: 220, minWidth: 180, maxWidth: 320, align: 'left', visibleByDefault: false, truncate: true, sortable: false, renderKind: 'notes' },
];

const COLUMN_SCHEMA_BY_KEY = Object.fromEntries(THREAT_TABLE_COLUMN_SCHEMA.map((column) => [column.key, column])) as Record<ThreatTableColumn, ThreatTableColumnSchema>;
const dateColumns: ThreatTableColumn[] = ['lastKill', 'lastLoss', 'lastActivity'];
const numericColumns = new Set<ThreatTableColumn>(['score', 'kills', 'losses', 'dangerPercent', 'soloPercent', 'avgGangSize', 'kl']);

interface ActiveTableColumn extends ThreatTableColumnSchema {
  visible: boolean;
  pixelWidth: number;
}

function matchFilter(row: ThreatRowView, filterText: string): boolean {
  if (!filterText) return true;
  const haystack = `${row.pilotName} ${row.corp} ${row.alliance} ${row.tags.join(' ')}`.toLowerCase();
  return haystack.includes(filterText.toLowerCase());
}

function parseSortableDate(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function compareByColumn(a: ThreatRowView, b: ThreatRowView, column: ThreatTableColumn): number {
  if (column === 'kl') {
    const ak = a.kills ?? -1;
    const bk = b.kills ?? -1;
    if (ak !== bk) return ak - bk;
    return (a.losses ?? -1) - (b.losses ?? -1);
  }
  if (column === 'lastActivity') {
    return parseSortableDate(formatLastActivity(a.lastKill, a.lastLoss)) - parseSortableDate(formatLastActivity(b.lastKill, b.lastLoss));
  }
  if (numericColumns.has(column)) {
    return Number(a[column]) - Number(b[column]);
  }
  if (dateColumns.includes(column)) {
    return parseSortableDate(String(a[column])) - parseSortableDate(String(b[column]));
  }
  return String(a[column]).localeCompare(String(b[column]));
}

function resolveColumnWidth(width: number, minWidth: number, maxWidth: number): number {
  return Math.min(maxWidth, Math.max(minWidth, Math.round(width)));
}

export function computeThreatTableColumns(
  visibleColumns: Partial<Record<ThreatTableColumn, boolean>>,
): ActiveTableColumn[] {
  return THREAT_TABLE_COLUMN_SCHEMA.map((column) => {
    const visible = visibleColumns[column.key] ?? column.visibleByDefault;
    const pixelWidth = resolveColumnWidth(column.width, column.minWidth, column.maxWidth);
    return {
      ...column,
      visible,
      pixelWidth,
    };
  });
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

  const columns = computeThreatTableColumns(options.visibleColumns ?? {});

  return {
    stickyHeader: true,
    compact: settingsCompact,
    rowCount: sorted.length,
    filterText: options.filterText ?? '',
    scrollContainerClassName: 'threat-table-scroll threat-table-scroll--fixed-height',
    bodyClassName: 'threat-table-body threat-table-body--virtualization-ready',
    headers: columns.map((column) => ({
      column: column.key,
      sortable: column.sortable,
      direction: column.key === sortBy ? direction : null,
      visible: column.visible,
      align: column.align,
      className: `threat-table-header ${column.align === 'right' ? 'text-right' : 'text-left'} sticky top-0`,
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

function normalizeValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function getCellText(row: ThreatRowView, key: ThreatTableColumn): string {
  if (key === 'kl') return formatKillLossCompact(row.kills, row.losses);
  if (key === 'lastActivity') return formatLastActivity(row.lastKill, row.lastLoss);
  if (key === 'tags') return normalizeValue(row.tags);
  return normalizeValue(row[key]);
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
  const filteredSortedRows = useMemo(() => {
    const filtered = rows.filter((row) => matchFilter(row, filterText));
    return [...filtered].sort((a, b) => {
      const cmp = compareByColumn(a, b, sortBy);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filterText, rows, sortBy, sortDirection]);

  const activeColumns = useMemo(() => computeThreatTableColumns(visibleColumns), [visibleColumns]);
  const visibleColumnDefs = useMemo(() => activeColumns.filter((column) => column.visible), [activeColumns]);
  const visibleColumnKeys = useMemo(() => visibleColumnDefs.map((column) => column.key), [visibleColumnDefs]);
  const widthMap = useMemo(
    () => Object.fromEntries(visibleColumnDefs.map((column) => [column.key, column.pixelWidth])) as Record<ThreatTableColumn, number>,
    [visibleColumnDefs],
  );

  const totalWidth = useMemo(() => visibleColumnDefs.reduce((sum, column) => sum + column.pixelWidth, 0), [visibleColumnDefs]);

  const tableStyle = useMemo<CSSProperties>(() => ({ minWidth: `${totalWidth}px`, width: `${totalWidth}px` }), [totalWidth]);

  useEffect(() => {
    onVisibleRowIdsChange?.(filteredSortedRows.map((row) => row.id));
  }, [filteredSortedRows, onVisibleRowIdsChange]);

  useEffect(() => {
    const debugFlag = typeof window !== 'undefined' && (window as { __THREAT_TABLE_COLUMN_DEBUG__?: boolean }).__THREAT_TABLE_COLUMN_DEBUG__;
    if (!debugFlag) return;
    console.debug('[ThreatTable:columns]', {
      visibleColumns: visibleColumnKeys,
      widthMap,
    });
  }, [visibleColumnKeys, widthMap]);

  return (
    <div className="threat-table-shell" data-testid="threat-table-shell">
      <div className="local-center-table-scroll threat-table-scroll--fixed-height" data-testid="local-center-table-scroll" ref={scrollParentRef}>
        <table data-testid="threat-table" aria-label="Threat rows" className="threat-table-grid" style={tableStyle}>
          <colgroup>
            {visibleColumnDefs.map((column) => (
              <col key={column.key} style={{ width: `${column.pixelWidth}px`, minWidth: `${column.pixelWidth}px`, maxWidth: `${column.pixelWidth}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {visibleColumnDefs.map((column) => (
                <th
                  key={column.key}
                  data-column-key={column.key}
                  data-column-width={column.pixelWidth}
                  className={column.align === 'right' ? 'text-right' : 'text-left'}
                >
                  <button type="button" onClick={() => onSortChange(column.key)} disabled={!column.sortable}>
                    {column.label}
                    {column.key === sortBy ? (sortDirection === 'asc' ? ' (asc)' : ' (desc)') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSortedRows.map((row) => {
              const rendered = buildThreatTableRow(row, row.id === selectedRowId, compactMode);
              return (
                <tr
                  key={row.id}
                  className={rendered.rowClassName}
                  data-selected={row.id === selectedRowId || undefined}
                  data-band={row.threatBand}
                  tabIndex={0}
                  onClick={() => onRowSelect(row.id)}
                  onDoubleClick={() => onRowTogglePin(row.id)}
                >
                  {visibleColumnDefs.map((column) => {
                    const cellValue = getCellText(row, column.key);
                    return (
                      <td
                        key={`${row.id}:${column.key}`}
                        data-column-key={column.key}
                        data-column-width={column.pixelWidth}
                        className={[
                          column.align === 'right' ? 'text-right' : 'text-left',
                          column.truncate ? 'threat-table-cell--truncate' : '',
                        ].filter(Boolean).join(' ')}
                        title={column.truncate ? cellValue : undefined}
                      >
                        {column.key === 'pilotName' ? (
                          <>
                            {isPinned(row.id) ? '📌 ' : ''}
                            {rendered.warningBadgeText ? (
                              <span
                                title={row.warnings?.filter((warning) => warning.displayTier === 'row_hint').map((warning) => warning.normalizedLabel ?? warning.message).slice(0, 2).join(', ') || 'Row warning'}
                                aria-label="row warnings"
                              >
                                {rendered.warningBadgeText}{' '}
                              </span>
                            ) : null}
                            {cellValue}
                          </>
                        ) : cellValue}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function getThreatTableVisibleColumnKeys(visibleColumns: Partial<Record<ThreatTableColumn, boolean>>): ThreatTableColumn[] {
  return computeThreatTableColumns(visibleColumns).filter((column) => column.visible).map((column) => column.key);
}

export function getThreatTableWidthMap(visibleColumns: Partial<Record<ThreatTableColumn, boolean>>): Record<ThreatTableColumn, number> {
  return computeThreatTableColumns(visibleColumns).reduce((map, column) => {
    map[column.key] = column.pixelWidth;
    return map;
  }, {} as Record<ThreatTableColumn, number>);
}

export function getThreatTableColumnSchema(column: ThreatTableColumn): ThreatTableColumnSchema {
  return COLUMN_SCHEMA_BY_KEY[column];
}
