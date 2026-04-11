import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { PilotDetailPanel } from './PilotDetailPanel';
import { VirtualThreatTable } from './ThreatTable';
import type { AnalyzeState } from './analyzeState';
import type { ThreatRowView, ThreatTableColumn } from './types';
import { toThreatRowView } from './threatRowMapper';
import { dehydrateWorkspacePrefs, hydrateWorkspacePrefs } from './workspacePrefs';
import { dedupeWarnings, groupWarningsBySeverityAndCategory } from '../../lib/api/warningRouting';

export interface LocalScreenProps {
  pastedText: string;
  analyzeState: AnalyzeState;
  onPasteChange: (text: string) => void;
  onAnalyze: () => void;
  onRefreshSelected?: (pilotId: string | null) => void;
  onCopySelected?: (pilotName: string | null) => void;
  onCopyAll?: (pilotNames: string[]) => void;
  onSettings?: () => void;
  useLocalIntelV2Layout?: boolean;
}

function toThreatRows(analyzeState: AnalyzeState): ThreatRowView[] {
  return (analyzeState.data?.pilots ?? []).map((pilot, index) => {
    const row = toThreatRowView(pilot, analyzeState.status === 'loading' ? 'loading' : 'ready');
    return { ...row, id: row.id || String(index) };
  });
}

function nextSelectionIndex(currentIndex: number, rowCount: number, key: 'ArrowUp' | 'ArrowDown'): number {
  if (rowCount === 0) return -1;
  if (currentIndex < 0) return 0;
  if (key === 'ArrowDown') return Math.min(rowCount - 1, currentIndex + 1);
  return Math.max(0, currentIndex - 1);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'textarea' || tagName === 'input' || target.isContentEditable;
}

function isRecentActivity(lastSeen: string | null, reference = new Date()): boolean {
  if (!lastSeen) return false;
  const parsed = Date.parse(lastSeen);
  if (Number.isNaN(parsed)) return false;
  const ageMs = reference.getTime() - parsed;
  return ageMs >= 0 && ageMs <= 14 * 24 * 60 * 60 * 1000;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export function formatRosterSummaryChip(parsedCount: number, resolvedCount: number): string {
  return `Roster · ${parsedCount} parsed · ${resolvedCount} resolved`;
}

export function formatDetailStatusChip(detailCount: number, totalCount: number): string {
  return `detail ${detailCount}/${totalCount}`;
}

export function LocalScreen({
  pastedText,
  analyzeState,
  onPasteChange,
  onAnalyze,
  onRefreshSelected,
  onCopySelected,
  onCopyAll,
  onSettings,
  useLocalIntelV2Layout = false,
}: LocalScreenProps) {
  const workspacePrefs = useMemo(() => hydrateWorkspacePrefs(), []);
  const baseRows = useMemo(() => toThreatRows(analyzeState), [analyzeState]);
  const diagnostics = analyzeState.data?.diagnostics;
  const unresolvedNames = diagnostics?.unresolvedNames ?? [];
  const globalWarnings = diagnostics?.globalWarnings ?? [];
  const groupedGlobalWarnings = useMemo(() => groupWarningsBySeverityAndCategory(dedupeWarnings(globalWarnings)), [globalWarnings]);
  const aggregateGlobalWarnings = diagnostics?.warningDisplay?.global ?? [];
  const partialKillmailTimestampCount = diagnostics?.warningCodeCounts?.DETAIL_TIME_INVALID ?? 0;

  const rightCollapsed = useMediaQuery('(max-width: 1439px)');
  const [activePane, setActivePane] = useState<'center' | 'right'>('center');

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ThreatTableColumn>(workspacePrefs.table.sortBy);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(workspacePrefs.table.sortDirection);
  const [filterText, setFilterText] = useState(workspacePrefs.table.filterText);
  const [quickFilters, setQuickFilters] = useState(workspacePrefs.table.quickFilters);
  const [compactMode, setCompactMode] = useState(workspacePrefs.compactDensity);
  const [visibleColumns, setVisibleColumns] = useState<Record<ThreatTableColumn, boolean>>(workspacePrefs.table.columnVisibility);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [columnWidths] = useState(workspacePrefs.table.columnWidths);
  const [panelSizes] = useState(workspacePrefs.layout.panelSizes);
  const [splitPositions] = useState(workspacePrefs.layout.splitPositions);
  const [pinnedRowIds, setPinnedRowIds] = useState<Set<string>>(new Set());
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [autoCollapseDrawer, setAutoCollapseDrawer] = useState(true);
  const [visibleRowIds, setVisibleRowIds] = useState<string[]>([]);
  const pasteInputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollParentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rightCollapsed) {
      setActivePane('center');
    }
  }, [rightCollapsed]);

  useEffect(() => {
    dehydrateWorkspacePrefs({
      ...workspacePrefs,
      lastPastedInput: pastedText,
      compactDensity: compactMode,
      table: {
        ...workspacePrefs.table,
        sortBy,
        sortDirection,
        filterText,
        quickFilters,
        columnVisibility: visibleColumns,
        columnWidths,
      },
      layout: {
        ...workspacePrefs.layout,
        panelSizes,
        splitPositions,
      },
    });
  }, [columnWidths, compactMode, filterText, panelSizes, pastedText, quickFilters, sortBy, sortDirection, splitPositions, visibleColumns, workspacePrefs]);

  useEffect(() => {
    if (!actionMessage) return;
    const timeoutId = window.setTimeout(() => setActionMessage(null), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [actionMessage]);

  useEffect(() => {
    if (!baseRows.length) {
      setSelectedRowId(null);
      return;
    }
    setSelectedRowId((prev) => (prev && baseRows.some((row) => row.id === prev) ? prev : baseRows[0]!.id));
  }, [baseRows]);

  const rows = useMemo(() => baseRows
    .filter((row) => {
      if (quickFilters.nonLowOnly && row.threatBand === 'low') return false;
      if (quickFilters.recentOnly && !isRecentActivity(row.lastSeen)) return false;
      return true;
    })
    .map((row) => {
      if (!pinnedRowIds.has(row.id)) return row;
      return {
        ...row,
        tags: row.tags.includes('Pinned') ? row.tags : [...row.tags, 'Pinned'],
      };
    }), [baseRows, pinnedRowIds, quickFilters.nonLowOnly, quickFilters.recentOnly]);

  const selectedRow = useMemo(() => rows.find((row) => row.id === selectedRowId) ?? null, [rows, selectedRowId]);

  const parsedCount = diagnostics?.candidateNamesCount ?? 0;
  const resolvedCount = diagnostics?.resolvedCount ?? 0;
  const unresolvedCount = unresolvedNames.length;
  const parseWarnings = analyzeState.data?.parseSummary.warnings ?? [];
  const detailRequestedCount = diagnostics?.detailCoverage?.detailRequested ?? rows.filter((row) => row.detailRequested).length;
  const detailFetchedCount = diagnostics?.detailCoverage?.detailFetched ?? rows.filter((row) => row.detailFetched).length;

  const rosterSummary = formatRosterSummaryChip(parsedCount, resolvedCount);
  const detailStatus = formatDetailStatusChip(detailFetchedCount, detailRequestedCount);

  const copyName = useCallback(async (pilotName: string | null) => {
    if (!pilotName) {
      setActionMessage('No selected pilot to copy.');
      return;
    }
    onCopySelected?.(pilotName);
    if (typeof navigator !== 'undefined' && navigator.clipboard) await navigator.clipboard.writeText(pilotName);
    setActionMessage(`Copied ${pilotName}.`);
  }, [onCopySelected]);

  const copyAllNames = useCallback(async () => {
    const names = rows.map((row) => row.pilotName);
    onCopyAll?.(names);
    if (typeof navigator !== 'undefined' && navigator.clipboard) await navigator.clipboard.writeText(names.join('\n'));
    setActionMessage(`Copied ${names.length} pilot name${names.length === 1 ? '' : 's'}.`);
  }, [onCopyAll, rows]);

  const refreshSelected = useCallback(() => {
    if (!selectedRow?.id) {
      setActionMessage('No selected pilot to refresh.');
      onRefreshSelected?.(null);
      return;
    }
    onRefreshSelected?.(selectedRow.id);
    setActionMessage(`Refreshing ${selectedRow.pilotName}...`);
  }, [onRefreshSelected, selectedRow]);

  const triggerAnalyze = useCallback(() => {
    onAnalyze();
    if (autoCollapseDrawer) setRosterOpen(false);
  }, [autoCollapseDrawer, onAnalyze]);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !isEditableTarget(event.target)) {
      event.preventDefault();
      triggerAnalyze();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      triggerAnalyze();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v' && !isEditableTarget(event.target)) {
      event.preventDefault();
      setRosterOpen(true);
      pasteInputRef.current?.focus();
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const currentIndex = visibleRowIds.findIndex((rowId) => rowId === selectedRowId);
      const nextIndex = nextSelectionIndex(currentIndex, visibleRowIds.length, event.key);
      setSelectedRowId(nextIndex >= 0 ? visibleRowIds[nextIndex] ?? null : null);
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      void copyAllNames();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      void copyName(selectedRow?.pilotName ?? null);
    }
  }, [copyAllNames, copyName, selectedRow?.pilotName, selectedRowId, triggerAnalyze, visibleRowIds]);

  if (!useLocalIntelV2Layout) return <div data-testid="local-screen-disabled">Local intel v2 layout is disabled.</div>;

  const showDesktopGrid = !rightCollapsed;

  return (
    <section
      className="local-screen"
      data-testid="local-screen"
      data-density={compactMode ? 'compact' : 'comfortable'}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="Local intel workspace"
    >
      <main className="local-center-panel" data-testid="local-center-panel" data-roster-collapsed={rosterOpen ? 'false' : 'true'}>
        <div className="local-center-controls" data-testid="local-center-controls">
          <button type="button" onClick={triggerAnalyze} disabled={analyzeState.status === 'loading'}>Analyze</button>
          <button type="button" onClick={refreshSelected}>Refresh Selected</button>
          <button type="button" onClick={() => void copyName(selectedRow?.pilotName ?? null)} disabled={!selectedRow}>Copy Selected</button>
          <button type="button" onClick={() => void copyAllNames()} disabled={!rows.length}>Copy All</button>
          <button type="button" data-testid="density-toggle" onClick={() => setCompactMode((v) => !v)}>{compactMode ? 'Comfortable' : 'Compact'}</button>
          <div className="columns-menu" data-testid="columns-menu">
            <button type="button" onClick={() => setColumnMenuOpen((v) => !v)}>Columns</button>
            {columnMenuOpen ? (
              <div className="columns-menu-popover">
                {Object.keys(visibleColumns).map((column) => (
                  <label key={column}><input type="checkbox" checked={visibleColumns[column as ThreatTableColumn]} onChange={() => setVisibleColumns((curr) => ({ ...curr, [column]: !curr[column as ThreatTableColumn] }))} />{column}</label>
                ))}
              </div>
            ) : null}
          </div>
          <button type="button" onClick={onSettings}>Settings</button>
          <span data-testid="detail-status-chip">{detailStatus}</span>
          <span role="status" aria-live="polite" data-testid="action-feedback">{actionMessage}</span>
        </div>

        <div className="roster-intake-drawer" data-testid="roster-intake-drawer" data-expanded={rosterOpen ? 'true' : 'false'}>
          <div className="roster-panel-header">
            <button type="button" className="roster-summary-chip" data-testid="roster-summary-chip" onClick={() => setRosterOpen((v) => !v)}>
              {rosterSummary}
            </button>
            <button type="button" onClick={() => setRosterOpen((v) => !v)} data-testid="roster-toggle">{rosterOpen ? 'Collapse' : 'Expand'}</button>
          </div>
          {rosterOpen ? (
            <div className="roster-drawer-expanded" data-testid="roster-drawer-expanded">
              <label htmlFor="paste-input">Pasted roster</label>
              <textarea ref={pasteInputRef} id="paste-input" data-testid="paste-textbox" value={pastedText} rows={6} onChange={(event) => onPasteChange(event.target.value)} />
              <p data-testid="parse-summary">Parsed {parsedCount} · resolved {resolvedCount} · unresolved {unresolvedCount}</p>
              <ul data-testid="parse-warnings-list">
                {parseWarnings.length ? parseWarnings.map((warning) => <li key={`${warning.code}-${warning.message}`}>{warning.normalizedLabel ?? warning.message}</li>) : <li>No parse warnings.</li>}
              </ul>
              <label>
                <input
                  type="checkbox"
                  checked={autoCollapseDrawer}
                  onChange={(event) => setAutoCollapseDrawer(event.target.checked)}
                  data-testid="auto-collapse-toggle"
                />
                Auto-collapse after analyze
              </label>
            </div>
          ) : null}
        </div>

        <div className="local-filter-row" data-testid="local-filter-row">
          <input data-testid="threat-filter" value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Filter pilot/corp/alliance/tags" />
          <label><input type="checkbox" checked={quickFilters.nonLowOnly} onChange={(event) => setQuickFilters((curr) => ({ ...curr, nonLowOnly: event.target.checked }))} />Non-low</label>
          <label><input type="checkbox" checked={quickFilters.recentOnly} onChange={(event) => setQuickFilters((curr) => ({ ...curr, recentOnly: event.target.checked }))} />Recent only</label>
        </div>

        <div className="local-layout-grid" data-testid="local-layout-grid" data-layout-mode={showDesktopGrid ? 'desktop' : 'stacked'} data-roster-collapsed={rosterOpen ? 'false' : 'true'}>
          <section className="local-table-shell" hidden={!showDesktopGrid && activePane !== 'center'}>
            <VirtualThreatTable
              rows={rows}
              selectedRowId={selectedRowId}
              compactMode={compactMode}
              sortBy={sortBy}
              sortDirection={sortDirection}
              filterText={filterText}
              visibleColumns={visibleColumns}
              onRowSelect={setSelectedRowId}
              onRowTogglePin={(rowId) => setPinnedRowIds((current) => {
                const next = new Set(current);
                if (next.has(rowId)) next.delete(rowId);
                else next.add(rowId);
                return next;
              })}
              onSortChange={(column) => {
                if (sortBy === column) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
                else {
                  setSortBy(column);
                  setSortDirection(column === 'pilotName' || column === 'corp' || column === 'alliance' ? 'asc' : 'desc');
                }
              }}
              isPinned={(rowId) => pinnedRowIds.has(rowId)}
              scrollParentRef={scrollParentRef}
              onVisibleRowIdsChange={setVisibleRowIds}
            />
          </section>

          {showDesktopGrid || activePane === 'right' ? (
            <aside className="local-right-panel" data-testid="local-right-panel" hidden={!showDesktopGrid && activePane !== 'right'}>
              <PilotDetailPanel row={selectedRow} />
            </aside>
          ) : null}
        </div>
      </main>

      <footer className="local-bottom-strip" data-testid="local-bottom-strip">
        <details data-testid="diagnostics-expander">
          <summary>Diagnostics · global warnings: {globalWarnings.length} · errors: {diagnostics?.severityCounts.error ?? 0} · warns: {diagnostics?.severityCounts.warn ?? 0}</summary>
          <p data-testid="diagnostic-partial-timestamps-count">Partial timestamps: {partialKillmailTimestampCount}</p>
          <ul data-testid="bottom-strip-warnings">
            {aggregateGlobalWarnings.length
              ? aggregateGlobalWarnings.map((item) => <li key={item.label}>{item.label}: {item.count}</li>)
              : Object.entries(groupedGlobalWarnings).length
                ? Object.entries(groupedGlobalWarnings).map(([group, warningItems]) => <li key={group}>{warningItems.length} × {warningItems[0]?.normalizedLabel ?? 'Warning'}</li>)
                : <li>No transport warnings.</li>}
          </ul>
        </details>
        <details data-testid="status-expander">
          <summary>Status</summary>
          <span>Status: {analyzeState.status} · pilots: {rows.length} · unresolved: {unresolvedNames.length} · {detailStatus} · split {splitPositions.vertical}/{splitPositions.horizontal}</span>
        </details>
      </footer>
    </section>
  );
}

export { nextSelectionIndex };
