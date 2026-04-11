import type { ThreatTableColumn } from './types';

const WORKSPACE_PREFS_KEY = 'goLocalThreat.localWorkspacePrefs';
const WORKSPACE_PREFS_VERSION = 2;

export interface LocalWorkspacePrefs {
  version: number;
  lastPastedInput: string;
  table: {
    sortBy: ThreatTableColumn;
    sortDirection: 'asc' | 'desc';
    filterText: string;
    quickFilters: {
      nonLowOnly: boolean;
      recentOnly: boolean;
    };
    columnVisibility: Record<ThreatTableColumn, boolean>;
    columnWidths: Partial<Record<ThreatTableColumn, number>>;
  };
  layout: {
    panelSizes: {
      left: number;
      center: number;
      right: number;
    };
    splitPositions: {
      vertical: number;
      horizontal: number;
    };
  };
  compactDensity: boolean;
}

export const defaultWorkspacePrefs = (): LocalWorkspacePrefs => ({
  version: WORKSPACE_PREFS_VERSION,
  lastPastedInput: '',
  table: {
    sortBy: 'score',
    sortDirection: 'desc',
    filterText: '',
    quickFilters: {
      nonLowOnly: false,
      recentOnly: false,
    },
    columnVisibility: {
      pilotName: true,
      corp: true,
      alliance: false,
      tags: true,
      score: true,
      threatBand: true,
      kills: true,
      losses: true,
      lastKill: true,
      lastLoss: false,
      mainShip: true,
      dangerPercent: false,
      soloPercent: false,
      avgGangSize: false,
      notes: false,
    },
    columnWidths: {},
  },
  layout: {
    panelSizes: {
      left: 25,
      center: 50,
      right: 25,
    },
    splitPositions: {
      vertical: 50,
      horizontal: 50,
    },
  },
  compactDensity: true,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function migrateWorkspacePrefs(raw: unknown): LocalWorkspacePrefs {
  const defaults = defaultWorkspacePrefs();
  if (!isRecord(raw)) return defaults;

  const version = typeof raw.version === 'number' ? raw.version : 0;

  if (version > WORKSPACE_PREFS_VERSION) {
    return defaults;
  }

  const table = isRecord(raw.table) ? raw.table : {};
  const layout = isRecord(raw.layout) ? raw.layout : {};
  const panelSizes = isRecord(layout.panelSizes) ? layout.panelSizes : {};
  const splitPositions = isRecord(layout.splitPositions) ? layout.splitPositions : {};

  const sortBy = typeof table.sortBy === 'string' && table.sortBy in defaults.table.columnVisibility
    ? table.sortBy as ThreatTableColumn
    : defaults.table.sortBy;

  const sortDirection = table.sortDirection === 'asc' || table.sortDirection === 'desc'
    ? table.sortDirection
    : defaults.table.sortDirection;

  const columnVisibility = {
    ...defaults.table.columnVisibility,
    ...(isRecord(table.columnVisibility) ? table.columnVisibility : {}),
  } as Record<ThreatTableColumn, boolean>;

  const columnWidths = isRecord(table.columnWidths)
    ? Object.fromEntries(
      Object.entries(table.columnWidths)
        .filter(([column, width]) => column in defaults.table.columnVisibility && typeof width === 'number' && Number.isFinite(width)),
    ) as Partial<Record<ThreatTableColumn, number>>
    : defaults.table.columnWidths;

  return {
    version: WORKSPACE_PREFS_VERSION,
    lastPastedInput: typeof raw.lastPastedInput === 'string' ? raw.lastPastedInput : defaults.lastPastedInput,
    table: {
      sortBy,
      sortDirection,
      filterText: typeof table.filterText === 'string' ? table.filterText : defaults.table.filterText,
      quickFilters: {
        nonLowOnly: isRecord(table.quickFilters) && typeof table.quickFilters.nonLowOnly === 'boolean'
          ? table.quickFilters.nonLowOnly
          : defaults.table.quickFilters.nonLowOnly,
        recentOnly: isRecord(table.quickFilters) && typeof table.quickFilters.recentOnly === 'boolean'
          ? table.quickFilters.recentOnly
          : defaults.table.quickFilters.recentOnly,
      },
      columnVisibility,
      columnWidths,
    },
    layout: {
      panelSizes: {
        left: typeof panelSizes.left === 'number' ? panelSizes.left : defaults.layout.panelSizes.left,
        center: typeof panelSizes.center === 'number' ? panelSizes.center : defaults.layout.panelSizes.center,
        right: typeof panelSizes.right === 'number' ? panelSizes.right : defaults.layout.panelSizes.right,
      },
      splitPositions: {
        vertical: typeof splitPositions.vertical === 'number' ? splitPositions.vertical : defaults.layout.splitPositions.vertical,
        horizontal: typeof splitPositions.horizontal === 'number' ? splitPositions.horizontal : defaults.layout.splitPositions.horizontal,
      },
    },
    compactDensity: typeof raw.compactDensity === 'boolean' ? raw.compactDensity : defaults.compactDensity,
  };
}

export function hydrateWorkspacePrefs(storage: Pick<Storage, 'getItem'> | null = typeof localStorage === 'undefined' ? null : localStorage): LocalWorkspacePrefs {
  if (!storage) return defaultWorkspacePrefs();

  const serialized = storage.getItem(WORKSPACE_PREFS_KEY);
  if (!serialized) return defaultWorkspacePrefs();

  try {
    const parsed = JSON.parse(serialized) as unknown;
    return migrateWorkspacePrefs(parsed);
  } catch {
    return defaultWorkspacePrefs();
  }
}

export function dehydrateWorkspacePrefs(
  prefs: LocalWorkspacePrefs,
  storage: Pick<Storage, 'setItem'> | null = typeof localStorage === 'undefined' ? null : localStorage,
): void {
  if (!storage) return;
  storage.setItem(WORKSPACE_PREFS_KEY, JSON.stringify({ ...prefs, version: WORKSPACE_PREFS_VERSION }));
}

export function workspacePrefsKey(): string {
  return WORKSPACE_PREFS_KEY;
}
