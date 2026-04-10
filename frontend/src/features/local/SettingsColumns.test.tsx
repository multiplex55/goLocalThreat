import { describe, expect, it } from 'vitest';
import { applySettings, renderLocalScreen } from './LocalScreen';
import type { LocalScreenViewModel } from './types';

const model: LocalScreenViewModel = {
  actions: ['paste', 'import', 'analyze', 'refresh', 'settings'],
  parseSummaryText: 'summary',
  parseWarnings: [],
  unresolvedWarnings: 0,
  rows: [],
  selectedRowId: null,
  detail: null,
  settings: { density: 'comfortable', visibleColumns: { pilotName: true, corp: true, alliance: true, ship: true } },
  status: { provider: 'online', cache: 'hot', rate: 'ok', updatedAt: 'now' },
  provisional: false,
  loading: false,
  diagnosticsSummary: { severityCounts: { info: 0, warn: 0, error: 0 }, providerCounts: {} },
};

describe('Settings driven columns', () => {
  it('hides columns disabled in settings', () => {
    const updated = applySettings(model, {
      density: 'compact',
      visibleColumns: { alliance: false, ship: false },
    });

    const rendered = renderLocalScreen(updated);
    expect(rendered.density).toBe('compact');
    expect(rendered.visibleColumns).toEqual(['pilotName', 'corp']);
  });
});
