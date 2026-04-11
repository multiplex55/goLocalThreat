import { describe, expect, it } from 'vitest';
import { dehydrateWorkspacePrefs, defaultWorkspacePrefs, hydrateWorkspacePrefs, workspacePrefsKey } from './workspacePrefs';

function createStorage(seed?: string) {
  let value = seed ?? null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
    read: () => value,
  };
}

describe('workspacePrefs persistence', () => {
  it('hydrates defaults when no state exists', () => {
    const storage = createStorage();
    const prefs = hydrateWorkspacePrefs(storage);

    expect(prefs).toEqual(defaultWorkspacePrefs());
  });

  it('dehydrates and rehydrates table/layout/input preferences', () => {
    const storage = createStorage();
    const prefs = {
      ...defaultWorkspacePrefs(),
      lastPastedInput: 'Alpha\nBeta',
      compactDensity: true,
      table: {
        ...defaultWorkspacePrefs().table,
        sortBy: 'pilotName' as const,
        sortDirection: 'asc' as const,
        columnWidths: { pilotName: 260, score: 90 },
      },
      layout: {
        panelSizes: { left: 20, center: 55, right: 25 },
        splitPositions: { vertical: 62, horizontal: 40 },
      },
    };

    dehydrateWorkspacePrefs(prefs, storage);
    const hydrated = hydrateWorkspacePrefs(storage);

    expect(hydrated.lastPastedInput).toBe('Alpha\nBeta');
    expect(hydrated.compactDensity).toBe(true);
    expect(hydrated.table.sortBy).toBe('pilotName');
    expect(hydrated.table.sortDirection).toBe('asc');
    expect(hydrated.table.filterText).toBe('');
    expect(hydrated.table.quickFilters.nonLowOnly).toBe(false);
    expect(hydrated.table.columnWidths.pilotName).toBe(260);
    expect(hydrated.layout.panelSizes.center).toBe(55);
    expect(hydrated.layout.splitPositions.vertical).toBe(62);
  });

  it('safely migrates malformed or unknown schema versions to defaults', () => {
    const brokenStorage = createStorage('{not json');
    expect(hydrateWorkspacePrefs(brokenStorage)).toEqual(defaultWorkspacePrefs());

    const future = createStorage(JSON.stringify({ version: 999, lastPastedInput: 'x' }));
    expect(hydrateWorkspacePrefs(future)).toEqual(defaultWorkspacePrefs());

    const legacy = createStorage(JSON.stringify({ version: 0, lastPastedInput: 'legacy' }));
    expect(hydrateWorkspacePrefs(legacy).lastPastedInput).toBe('legacy');
    expect(workspacePrefsKey()).toContain('localWorkspacePrefs');
  });

  it('hydrates persisted filter preferences', () => {
    const storage = createStorage(JSON.stringify({
      version: 2,
      table: {
        sortBy: 'score',
        sortDirection: 'desc',
        filterText: 'alpha',
        quickFilters: { nonLowOnly: true, recentOnly: true },
      },
    }));

    const hydrated = hydrateWorkspacePrefs(storage);
    expect(hydrated.table.filterText).toBe('alpha');
    expect(hydrated.table.quickFilters.nonLowOnly).toBe(true);
    expect(hydrated.table.quickFilters.recentOnly).toBe(true);
  });
});
