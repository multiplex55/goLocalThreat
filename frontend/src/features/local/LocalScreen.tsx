import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { buildDetailPanel } from './DetailPanel';
import { buildThreatTable } from './ThreatTable';
import type { AnalyzeState } from './analyzeState';
import type { LocalScreenViewModel, ThreatRowView } from './types';

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
  return (analyzeState.data?.pilots ?? []).map((pilot, index) => ({
    id: pilot.id,
    pilotName: pilot.name,
    corp: pilot.corporation,
    alliance: pilot.alliance,
    ship: 'Unknown ship',
    score: pilot.score,
    level: pilot.band === 'critical' || pilot.band === 'high' || pilot.band === 'medium' || pilot.band === 'low' ? pilot.band : 'low',
    tags: pilot.reasons,
    lastSeen: `confidence ${Math.round(pilot.confidence * 100)}%`,
    status: analyzeState.status === 'loading' ? 'loading' : 'ready',
    warnings: warningsByPilotId[pilot.id]?.map((warning) => ({
      provider: warning.provider,
      severity: warning.severity,
      userVisible: warning.userVisible,
      message: warning.message,
    })) ?? [],
  }))
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

  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);

  useEffect(() => {
    if (!rows.length) {
      setSelectedRowIndex(-1);
      return;
    }
    setSelectedRowIndex((prev) => (prev < 0 || prev >= rows.length ? 0 : prev));
  }, [rows]);

  const selectedRow = selectedRowIndex >= 0 ? rows[selectedRowIndex] : null;
  const table = useMemo(() => buildThreatTable(rows, selectedRow?.id ?? null, false), [rows, selectedRow?.id]);
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
      setSelectedRowIndex((prev) => nextSelectionIndex(prev, rows.length, event.key));
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
      void copyName(selectedRow?.pilotName ?? null);
    }
  }, [copyName, onAnalyze, rows.length, selectedRow?.pilotName]);

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
          <div data-testid="unresolved-names">
            <strong>Unresolved names ({unresolvedNames.length})</strong>
            <ul>
              {unresolvedNames.map((name) => <li key={name}>{name}</li>)}
            </ul>
          </div>
        </aside>

        <main data-testid="local-center-panel">
          <h3>Threat table</h3>
          <ul data-testid="threat-table" aria-label="Threat rows">
            {table.rows.map((row, index) => (
              <li key={row.id}>
                <button
                  type="button"
                  aria-current={row.selected ? 'true' : undefined}
                  onClick={() => setSelectedRowIndex(index)}
                >
                  {row.cells[0]?.text ?? rows[index]?.pilotName} · {rows[index]?.score ?? 0} · {rows[index]?.level ?? 'low'}
                </button>
              </li>
            ))}
          </ul>
        </main>

        <aside data-testid="local-right-panel">
          <h3 data-testid="detail-title">{detail.title}</h3>
          <div data-testid="detail-pane">
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
        <span>Status: {analyzeState.status} · pilots: {rows.length}</span>
      </footer>
    </section>
  );
}

export { nextSelectionIndex };


export function applySettings(
  view: LocalScreenViewModel,
  updates: Partial<LocalScreenViewModel['settings']>,
): LocalScreenViewModel {
  return {
    ...view,
    settings: {
      ...view.settings,
      ...updates,
      visibleColumns: {
        ...view.settings.visibleColumns,
        ...(updates.visibleColumns ?? {}),
      },
    },
  };
}


export interface LocalScreenRender {
  visibleColumns: string[];
  density: 'comfortable' | 'compact';
}

export function renderLocalScreen(view: LocalScreenViewModel): LocalScreenRender {
  return {
    visibleColumns: Object.entries(view.settings.visibleColumns)
      .filter(([, enabled]) => enabled)
      .map(([column]) => column),
    density: view.settings.density,
  };
}
