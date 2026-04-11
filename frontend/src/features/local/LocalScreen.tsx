import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { PilotDetailPanel } from './PilotDetailPanel';
import { buildThreatTable } from './ThreatTable';
import type { AnalyzeState } from './analyzeState';
import type { ThreatRowView, ThreatTableColumn } from './types';
import { toThreatRowView } from './threatRowMapper';
import { dehydrateWorkspacePrefs, hydrateWorkspacePrefs } from './workspacePrefs';

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
  const partialKillmailTimestampCount = diagnostics?.warningCodeCounts?.DETAIL_TIME_INVALID ?? 0;

  const rightCollapsed = useMediaQuery('(max-width: 1439px)');
  const leftCollapsed = useMediaQuery('(max-width: 1169px)');
  const [activePane, setActivePane] = useState<'center' | 'left' | 'right'>('center');

  useEffect(() => {
    if (!rightCollapsed) {
      setActivePane('center');
      return;
    }
    if (leftCollapsed && activePane === 'left') {
      setActivePane('center');
    }
  }, [activePane, leftCollapsed, rightCollapsed]);

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ThreatTableColumn>(workspacePrefs.table.sortBy);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(workspacePrefs.table.sortDirection);
  const [filterText, setFilterText] = useState('');
  const [compactMode, setCompactMode] = useState(workspacePrefs.compactDensity);
  const [visibleColumns, setVisibleColumns] = useState<Record<ThreatTableColumn, boolean>>(workspacePrefs.table.columnVisibility);
  const [columnWidths] = useState(workspacePrefs.table.columnWidths);
  const [panelSizes] = useState(workspacePrefs.layout.panelSizes);
  const [splitPositions] = useState(workspacePrefs.layout.splitPositions);
  const [pinnedRowIds, setPinnedRowIds] = useState<Set<string>>(new Set());
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const pasteInputRef = useRef<HTMLTextAreaElement | null>(null);

  const rows = useMemo(() => baseRows.map((row) => {
    if (!pinnedRowIds.has(row.id)) return row;
    return {
      ...row,
      tags: row.tags.includes('Pinned') ? row.tags : [...row.tags, 'Pinned'],
    };
  }), [baseRows, pinnedRowIds]);

  const table = useMemo(() => buildThreatTable(rows, selectedRowId, compactMode, { sortBy, sortDirection, filterText, visibleColumns }), [rows, selectedRowId, compactMode, sortBy, sortDirection, filterText, visibleColumns]);

  useEffect(() => {
    dehydrateWorkspacePrefs({
      ...workspacePrefs,
      lastPastedInput: pastedText,
      compactDensity: compactMode,
      table: {
        ...workspacePrefs.table,
        sortBy,
        sortDirection,
        columnVisibility: visibleColumns,
        columnWidths,
      },
      layout: {
        ...workspacePrefs.layout,
        panelSizes,
        splitPositions,
      },
    });
  }, [columnWidths, compactMode, panelSizes, pastedText, sortBy, sortDirection, splitPositions, visibleColumns, workspacePrefs]);

  useEffect(() => {
    if (!actionMessage) return;
    const timeoutId = window.setTimeout(() => setActionMessage(null), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [actionMessage]);

  useEffect(() => {
    if (!rows.length) {
      setSelectedRowId(null);
      return;
    }
    setSelectedRowId((prev) => (prev && rows.some((row) => row.id === prev) ? prev : rows[0]!.id));
  }, [rows]);

  const selectedRow = useMemo(() => table.rows.find((row) => row.id === selectedRowId)?.row ?? null, [selectedRowId, table.rows]);
  const copyName = useCallback(async (pilotName: string | null) => {
    if (!pilotName) {
      setActionMessage('No selected pilot to copy.');
      return;
    }
    onCopySelected?.(pilotName);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(pilotName);
    }
    setActionMessage(`Copied ${pilotName}.`);
  }, [onCopySelected]);

  const copyAllNames = useCallback(async () => {
    const names = rows.map((row) => row.pilotName);
    onCopyAll?.(names);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(names.join('\n'));
    }
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

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onAnalyze();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v' && !isEditableTarget(event.target)) {
      event.preventDefault();
      pasteInputRef.current?.focus();
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        void navigator.clipboard.readText().then((clipboardText) => {
          if (clipboardText) {
            const separator = pastedText.trim() ? '\n' : '';
            onPasteChange(`${pastedText}${separator}${clipboardText}`);
          }
        });
      }
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const currentIndex = table.rows.findIndex((row) => row.id === selectedRowId);
      const nextIndex = nextSelectionIndex(currentIndex, table.rows.length, event.key);
      setSelectedRowId(nextIndex >= 0 ? table.rows[nextIndex]!.id : null);
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
      void copyName(selectedRow?.pilotName ?? null);
    }
  }, [copyName, onAnalyze, onPasteChange, pastedText, selectedRow?.pilotName, selectedRowId, table.rows]);

  if (!useLocalIntelV2Layout) {
    return <div data-testid="local-screen-disabled">Local intel v2 layout is disabled.</div>;
  }

  const showDesktopGrid = !rightCollapsed;

  return (
    <section className="local-screen" data-testid="local-screen" tabIndex={0} onKeyDown={onKeyDown} aria-label="Local intel workspace">
      <header className="local-top-toolbar" data-testid="local-top-toolbar" aria-label="Top action and tabs bar">
        <button type="button" onClick={onAnalyze} disabled={analyzeState.status === 'loading'}>Analyze</button>
        <button type="button" onClick={refreshSelected}>Refresh Selected</button>
        <button type="button" onClick={() => void copyName(selectedRow?.pilotName ?? null)} disabled={!selectedRow}>Copy Selected</button>
        <button type="button" onClick={() => void copyAllNames()} disabled={!rows.length}>Copy All</button>
        <button type="button" onClick={onSettings}>Settings</button>
        {rightCollapsed ? (
          <nav aria-label="Pane tabs" className="local-pane-tabs" data-testid="local-pane-tabs">
            {!leftCollapsed && <button type="button" aria-pressed={activePane === 'left'} onClick={() => setActivePane('left')}>Roster</button>}
            <button type="button" aria-pressed={activePane === 'center'} onClick={() => setActivePane('center')}>Table</button>
            <button type="button" aria-pressed={activePane === 'right'} onClick={() => setActivePane('right')}>Details</button>
          </nav>
        ) : null}
        <span role="status" aria-live="polite" data-testid="action-feedback">{actionMessage}</span>
      </header>

      <div className="local-layout-grid" data-testid="local-layout-grid" data-layout-mode={showDesktopGrid ? 'desktop' : 'stacked'}>
        {(!leftCollapsed || showDesktopGrid || activePane === 'left') ? (
          <aside
            className="local-left-panel"
            data-testid="local-left-panel"
            aria-label="Left roster input pane"
            hidden={!showDesktopGrid && activePane !== 'left'}
          >
            <label htmlFor="paste-input">Pasted roster</label>
            <textarea ref={pasteInputRef} id="paste-input" data-testid="paste-textbox" value={pastedText} rows={8} onChange={(event) => onPasteChange(event.target.value)} />
            <p data-testid="parse-summary">Parsed {diagnostics?.candidateNamesCount ?? 0} candidates · resolved {diagnostics?.resolvedCount ?? 0}</p>
          </aside>
        ) : null}

        <main className="local-center-panel" data-testid="local-center-panel" aria-label="Center threat table pane" hidden={!showDesktopGrid && activePane !== 'center'}>
          <h3>Threat table</h3>
          <input data-testid="threat-filter" value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Filter pilot/corp/alliance/tags" />
          <button type="button" data-testid="density-toggle" onClick={() => setCompactMode((v) => !v)}>{compactMode ? 'Comfortable' : 'Compact'}</button>
          <div data-testid="column-toggles">{table.headers.map((h) => (
            <label key={h.column}><input type="checkbox" checked={visibleColumns[h.column]} onChange={() => setVisibleColumns((curr) => ({ ...curr, [h.column]: !curr[h.column] }))} />{h.column}</label>
          ))}</div>
          <div className="local-center-table-scroll">
            <table data-testid="threat-table" aria-label="Threat rows">
              <thead>
                <tr>
                  {table.headers.filter((h) => h.visible).map((h) => (
                    <th key={h.column} style={{ width: columnWidths[h.column] ? `${columnWidths[h.column]}px` : undefined }}>
                      <button type="button" onClick={() => {
                        if (sortBy === h.column) {
                          setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
                        } else {
                          setSortBy(h.column);
                          setSortDirection(h.column === 'pilotName' || h.column === 'corp' || h.column === 'alliance' ? 'asc' : 'desc');
                        }
                      }}>{h.column}{h.direction ? ` (${h.direction})` : ''}</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((tableRow) => (
                  <tr
                    key={tableRow.id}
                    className={tableRow.rendered.rowClassName}
                    data-band={tableRow.row.threatBand}
                    data-selected={tableRow.selected || undefined}
                    tabIndex={0}
                    onClick={() => setSelectedRowId(tableRow.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedRowId(tableRow.id);
                      }
                    }}
                    onDoubleClick={() => setPinnedRowIds((current) => {
                      const next = new Set(current);
                      if (next.has(tableRow.id)) {
                        next.delete(tableRow.id);
                      } else {
                        next.add(tableRow.id);
                      }
                      return next;
                    })}
                  >
                    {table.headers.filter((h) => h.visible).map((h) => {
                      const renderedRow = tableRow.rendered;
                      if (h.column === 'pilotName') {
                        return (
                          <td key={h.column}>
                            {pinnedRowIds.has(tableRow.id) ? '📌 ' : ''}
                            {renderedRow.identity.name}
                          </td>
                        );
                      }
                      if (h.column === 'corp') {
                        return <td key={h.column} className={renderedRow.identity.metadataClassName}>{renderedRow.cells[1]}</td>;
                      }
                      if (h.column === 'alliance') {
                        return <td key={h.column} className={renderedRow.identity.metadataClassName}>{renderedRow.cells[2]}</td>;
                      }
                      if (h.column === 'score') {
                        return <td key={h.column}><span className="threat-row-score-badge">{renderedRow.score.badgeText}</span></td>;
                      }
                      if (h.column === 'threatBand') {
                        return <td key={h.column} className={renderedRow.threatBandClassName}>{tableRow.row.threatBand.toUpperCase()}</td>;
                      }
                      if (h.column === 'kills') return <td key={h.column}>{renderedRow.numericCells.kills}</td>;
                      if (h.column === 'losses') return <td key={h.column}>{renderedRow.numericCells.losses}</td>;
                      if (h.column === 'dangerPercent') return <td key={h.column}>{renderedRow.numericCells.dangerPercent}</td>;
                      if (h.column === 'soloPercent') return <td key={h.column}>{renderedRow.numericCells.soloPercent}</td>;
                      if (h.column === 'avgGangSize') return <td key={h.column}>{renderedRow.numericCells.avgGangSize}</td>;
                      if (h.column === 'tags') {
                        return (
                          <td key={h.column}>
                            <div className="threat-table-tags">
                              {renderedRow.tagCell.visible.map((tag) => <span key={tag.label} className="threat-table-chip">{tag.label}</span>)}
                              {renderedRow.tagCell.overflowCount ? <span className="threat-table-chip">+{renderedRow.tagCell.overflowCount}</span> : null}
                            </div>
                          </td>
                        );
                      }

                      const value = tableRow.row[h.column];
                      const rendered = Array.isArray(value) ? value.join(', ') : (value ?? '—');
                      return <td key={h.column}>{String(rendered) || '—'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>

        {showDesktopGrid || activePane === 'right' ? (
          <aside
            className="local-right-panel"
            data-testid="local-right-panel"
            aria-label="Right detail and warnings pane"
            hidden={!showDesktopGrid && activePane !== 'right'}
          >
            <PilotDetailPanel row={selectedRow} />
          </aside>
        ) : null}
      </div>

      <footer className="local-bottom-strip" data-testid="local-bottom-strip" aria-label="Bottom diagnostics strip">
        <details data-testid="diagnostics-expander">
          <summary>
            Diagnostics · global warnings: {globalWarnings.length} · errors: {diagnostics?.severityCounts.error ?? 0} · warns: {diagnostics?.severityCounts.warn ?? 0}
          </summary>
          <p data-testid="diagnostic-partial-timestamps-count">
            Partial killmail timestamps: {partialKillmailTimestampCount}
          </p>
          <p>
            Providers:&nbsp;
            {Object.entries(diagnostics?.providerCounts ?? {})
              .map(([provider, count]) => `${provider}=${count}`)
              .join(', ') || 'none'}
          </p>
        </details>
        <span>Status: {analyzeState.status} · pilots: {rows.length} · unresolved: {unresolvedNames.length} · split {splitPositions.vertical}/{splitPositions.horizontal}</span>
      </footer>
    </section>
  );
}

export { nextSelectionIndex };
