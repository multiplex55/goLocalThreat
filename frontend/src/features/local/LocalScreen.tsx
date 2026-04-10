import { buildDetailPanel } from './DetailPanel';
import { buildParseWarnings } from './ParseWarnings';
import { renderStatusBar } from './StatusBar';
import { buildThreatTable } from './ThreatTable';
import type { LocalScreenViewModel, ThreatRowView } from './types';

export interface LocalScreenRender {
  topBarActions: LocalScreenViewModel['actions'];
  parsePanel: {
    summary: string;
    warnings: ReturnType<typeof buildParseWarnings>;
  };
  table: ReturnType<typeof buildThreatTable>;
  detailPane: ReturnType<typeof buildDetailPanel>;
  statusBar: string;
  visibleColumns: string[];
  density: 'comfortable' | 'compact';
  loading: boolean;
  provisional: boolean;
}

function selectedOrFirst(rows: ThreatRowView[], selectedRowId: string | null): string | null {
  if (!rows.length) return null;
  return rows.some((r) => r.id === selectedRowId) ? selectedRowId : rows[0].id;
}

export function withSelection(view: LocalScreenViewModel, selectedRowId: string | null): LocalScreenViewModel {
  const resolved = selectedOrFirst(view.rows, selectedRowId);
  return {
    ...view,
    selectedRowId: resolved,
    detail: view.rows.find((r) => r.id === resolved) ?? null,
  };
}

export function moveSelectionByKeyboard(view: LocalScreenViewModel, key: 'ArrowDown' | 'ArrowUp'): LocalScreenViewModel {
  if (!view.rows.length) return view;
  const index = Math.max(0, view.rows.findIndex((r) => r.id === view.selectedRowId));
  const nextIndex = key === 'ArrowDown'
    ? Math.min(view.rows.length - 1, index + 1)
    : Math.max(0, index - 1);
  return withSelection(view, view.rows[nextIndex].id);
}

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

export function markProvisional(view: LocalScreenViewModel): LocalScreenViewModel {
  return {
    ...view,
    provisional: true,
    rows: view.rows.map((row) => ({ ...row, status: 'provisional' })),
  };
}

export function markLoading(view: LocalScreenViewModel): LocalScreenViewModel {
  return {
    ...view,
    loading: true,
    rows: view.rows.map((row) => ({ ...row, status: 'loading' })),
  };
}

export function renderLocalScreen(view: LocalScreenViewModel): LocalScreenRender {
  const selected = selectedOrFirst(view.rows, view.selectedRowId);
  const active = view.rows.find((r) => r.id === selected) ?? null;

  return {
    topBarActions: view.actions,
    parsePanel: {
      summary: view.parseSummaryText,
      warnings: buildParseWarnings(view.parseWarnings),
    },
    table: buildThreatTable(view.rows, selected, view.settings.density === 'compact'),
    detailPane: buildDetailPanel(active),
    statusBar: renderStatusBar(view.status),
    visibleColumns: Object.entries(view.settings.visibleColumns)
      .filter(([, on]) => on)
      .map(([name]) => name),
    density: view.settings.density,
    loading: view.loading,
    provisional: view.provisional,
  };
}
