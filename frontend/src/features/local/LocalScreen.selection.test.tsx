import { describe, expect, it } from 'vitest';
import { moveSelectionByKeyboard, renderLocalScreen, withSelection } from './LocalScreen';
import type { LocalScreenViewModel } from './types';

const base: LocalScreenViewModel = {
  actions: ['paste', 'import', 'analyze', 'refresh', 'settings'],
  parseSummaryText: 'summary',
  parseWarnings: [],
  unresolvedWarnings: 0,
  rows: [
    { id: '1', pilotName: 'Alpha', corp: 'A', alliance: 'AA', ship: 'ShipA', score: 10, level: 'low', tags: [], lastSeen: 'now', status: 'ready' },
    { id: '2', pilotName: 'Bravo', corp: 'B', alliance: 'BB', ship: 'ShipB', score: 90, level: 'critical', tags: [], lastSeen: 'now', status: 'ready' },
  ],
  selectedRowId: '1',
  detail: null,
  settings: { density: 'comfortable', visibleColumns: { pilotName: true, score: true } },
  status: { provider: 'online', cache: 'hot', rate: 'ok', updatedAt: 'now' },
  provisional: false,
  loading: false,
};

describe('LocalScreen selection sync', () => {
  it('updates detail panel immediately when row selection changes', () => {
    const updated = withSelection(base, '2');
    const rendered = renderLocalScreen(updated);
    expect(rendered.detailPane.title).toBe('Bravo');
  });

  it('supports keyboard navigation', () => {
    const next = moveSelectionByKeyboard(base, 'ArrowDown');
    expect(next.selectedRowId).toBe('2');
    expect(next.detail?.pilotName).toBe('Bravo');
  });
});
