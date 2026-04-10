import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { buildDetailPanel } from './DetailPanel';
import { buildThreatTable } from './ThreatTable';
import type { AnalyzeState } from './analyzeState';
import type { ThreatRowView, ThreatTableColumn } from './types';

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
  const warningsByPilotId = analyzeState.data?.diagnostics.warningsByPilotId ?? {};
  return (analyzeState.data?.pilots ?? []).map((pilot, index) => {
    const confidencePercent = Math.round(pilot.confidence * 100);
    const reasonBreakdown = pilot.reasons.map((reason, reasonIndex) => ({
      label: reason,
      score: Math.max(5, 30 - (reasonIndex * 5)),
    }));
    const dataCompletenessMarkers = pilot.confidence < 0.7
      ? ['Unknown due to partial killmail timestamps']
      : [];

    return ({
    id: pilot.id,
    pilotName: pilot.name,
    corp: pilot.corporation,
    alliance: pilot.alliance,
    mainShip: 'Unknown ship',
    mainRecentShip: 'Unknown ship',
    score: pilot.score,
    threatBand: pilot.band === 'critical' || pilot.band === 'high' || pilot.band === 'medium' || pilot.band === 'low' ? pilot.band : 'low',
    confidence: pilot.confidence,
    reasonBreakdown,
    kills: 0,
    losses: 0,
    dangerPercent: 0,
    soloPercent: 0,
    avgGangSize: 0,
    soloGangTendency: 'Unknown',
    lastKill: 'Unknown',
    lastLoss: 'Unknown',
    lastActivitySummary: 'No recent kill/loss timestamps available',
    freshness: confidencePercent >= 70 ? 'Recently Active' : 'Stale Data',
    tags: pilot.reasons,
    notes: '',
    lastSeen: `confidence ${confidencePercent}%`,
    status: analyzeState.status === 'loading' ? 'loading' : 'ready',
    dataCompletenessMarkers,
    warnings: warningsByPilotId[pilot.id]?.map((warning) => ({
      provider: warning.provider,
      severity: warning.severity,
      userVisible: warning.userVisible,
      message: warning.message,
    })) ?? [],
  });
  })
    .map((row, index) => ({ ...row, id: row.id || String(index) }));
}

function nextSelectionIndex(currentIndex: number, rowCount: number, key: 'ArrowUp' | 'ArrowDown'): number {
  if (rowCount === 0) return -1;
  if (currentIndex < 0) return 0;
  if (key === 'ArrowDown') return Math.min(rowCount - 1, currentIndex + 1);
  return Math.max(0, currentIndex - 1);
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
  const rows = useMemo(() => toThreatRows(analyzeState), [analyzeState]);
  const diagnostics = analyzeState.data?.diagnostics;
  const unresolvedNames = diagnostics?.unresolvedNames ?? [];
  const globalWarnings = diagnostics?.globalWarnings ?? [];

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ThreatTableColumn>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterText, setFilterText] = useState('');
  const [compactMode, setCompactMode] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<ThreatTableColumn, boolean>>({
    pilotName: true, corp: true, alliance: true, score: true, threatBand: true, kills: true, losses: true, dangerPercent: true, soloPercent: true,
    avgGangSize: true, lastKill: true, lastLoss: true, mainShip: true, tags: true, notes: true,
  });

  const table = useMemo(() => buildThreatTable(rows, selectedRowId, compactMode, { sortBy, sortDirection, filterText, visibleColumns }), [rows, selectedRowId, compactMode, sortBy, sortDirection, filterText, visibleColumns]);

  useEffect(() => {
    if (!rows.length) {
      setSelectedRowId(null);
      return;
    }
    setSelectedRowId((prev) => (prev && rows.some((row) => row.id === prev) ? prev : rows[0]!.id));
  }, [rows]);

  const selectedRow = useMemo(() => table.rows.find((row) => row.id === selectedRowId)?.row ?? null, [selectedRowId, table.rows]);
  const detail = useMemo(() => buildDetailPanel(selectedRow), [selectedRow]);

  const copyName = useCallback(async (pilotName: string | null) => {
    if (!pilotName) return;
    onCopySelected?.(pilotName);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(pilotName);
    }
  }, [onCopySelected]);

  const copyAllNames = useCallback(async () => {
    const names = rows.map((row) => row.pilotName);
    onCopyAll?.(names);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(names.join('\n'));
    }
  }, [onCopyAll, rows]);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onAnalyze();
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
  }, [copyName, onAnalyze, selectedRow?.pilotName, selectedRowId, table.rows]);

  if (!useLocalIntelV2Layout) {
    return <div data-testid="local-screen-disabled">Local intel v2 layout is disabled.</div>;
  }

  return (
    <section data-testid="local-screen" tabIndex={0} onKeyDown={onKeyDown} aria-label="Local intel workspace">
      <header data-testid="local-top-toolbar">
        <button type="button" onClick={onAnalyze} disabled={analyzeState.status === 'loading'}>Analyze</button>
        <button type="button" onClick={() => onRefreshSelected?.(selectedRow?.id ?? null)} disabled={!selectedRow}>Refresh Selected</button>
        <button type="button" onClick={() => void copyName(selectedRow?.pilotName ?? null)} disabled={!selectedRow}>Copy Selected</button>
        <button type="button" onClick={() => void copyAllNames()} disabled={!rows.length}>Copy All</button>
        <button type="button" onClick={onSettings}>Settings</button>
      </header>

      <div data-testid="local-layout-grid">
        <aside data-testid="local-left-panel">
          <label htmlFor="paste-input">Pasted roster</label>
          <textarea id="paste-input" data-testid="paste-textbox" value={pastedText} rows={8} onChange={(event) => onPasteChange(event.target.value)} />
          <p data-testid="parse-summary">Parsed {diagnostics?.candidateNamesCount ?? 0} candidates · resolved {diagnostics?.resolvedCount ?? 0}</p>
        </aside>

        <main data-testid="local-center-panel">
          <h3>Threat table</h3>
          <input data-testid="threat-filter" value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Filter pilot/corp/alliance/tags" />
          <button type="button" data-testid="density-toggle" onClick={() => setCompactMode((v) => !v)}>{compactMode ? 'Comfortable' : 'Compact'}</button>
          <div data-testid="column-toggles">{table.headers.map((h) => (
            <label key={h.column}><input type="checkbox" checked={visibleColumns[h.column]} onChange={() => setVisibleColumns((curr) => ({ ...curr, [h.column]: !curr[h.column] }))} />{h.column}</label>
          ))}</div>
          <table data-testid="threat-table" aria-label="Threat rows">
            <thead>
              <tr>
                {table.headers.filter((h) => h.visible).map((h) => (
                  <th key={h.column}>
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
                <tr key={tableRow.id} data-selected={tableRow.selected || undefined} onClick={() => setSelectedRowId(tableRow.id)}>
                  {table.headers.filter((h) => h.visible).map((h) => <td key={h.column}>{Array.isArray(tableRow.row[h.column]) ? (tableRow.row[h.column] as string[]).join(', ') : String(tableRow.row[h.column])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </main>

        <aside data-testid="local-right-panel">
          <h3 data-testid="detail-title">{detail.title}</h3>
          <div data-testid="detail-pane">
            <div data-testid="detail-semantic-badges">
              {detail.semanticBadges.map((badge) => (
                <span key={badge.label} data-tone={badge.tone}>{badge.label}</span>
              ))}
            </div>
            {detail.sections.map((section) => (
              <p key={section.label}><strong>{section.label}:</strong> {section.value}</p>
            ))}
            <div data-testid="detail-warnings">
              <strong>Warnings</strong>
              <ul>
                {detail.warnings.map((warning, index) => (
                  <li key={`${warning.text}-${index}`} style={{ opacity: warning.muted ? 0.6 : 1 }}>
                    {warning.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>

      <footer data-testid="local-bottom-strip">
        <details data-testid="diagnostics-expander">
          <summary>
            Diagnostics · global warnings: {globalWarnings.length} · errors: {diagnostics?.severityCounts.error ?? 0} · warns: {diagnostics?.severityCounts.warn ?? 0}
          </summary>
          <p>
            Providers:&nbsp;
            {Object.entries(diagnostics?.providerCounts ?? {})
              .map(([provider, count]) => `${provider}=${count}`)
              .join(', ') || 'none'}
          </p>
        </details>
        <span>Status: {analyzeState.status} · pilots: {rows.length} · unresolved: {unresolvedNames.length}</span>
      </footer>
    </section>
  );
}

export { nextSelectionIndex };
