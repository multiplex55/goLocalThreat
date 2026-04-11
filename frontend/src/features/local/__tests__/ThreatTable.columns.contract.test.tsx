import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import {
  THREAT_TABLE_COLUMN_SCHEMA,
  VirtualThreatTable,
  computeThreatTableColumns,
  getThreatTableVisibleColumnKeys,
  getThreatTableWidthMap,
} from '../ThreatTable';
import type { ThreatRowView, ThreatTableColumn } from '../types';

const baseRow: ThreatRowView = {
  id: 'pilot-1',
  pilotName: 'Cipher',
  corp: 'Nova Corp',
  corpTicker: 'NOVA',
  alliance: 'Dark Tide',
  allianceTicker: 'TIDE',
  orgMetadataPartial: false,
  mainShip: 'Loki',
  mainRecentShip: 'Loki',
  score: 81,
  threatBand: 'high',
  confidence: 0.9,
  reasonBreakdown: [],
  kills: 8,
  losses: 2,
  dangerPercent: 64.2,
  soloPercent: 22,
  avgGangSize: 3.7,
  soloGangTendency: 'mixed',
  lastKill: '2026-04-10T10:00:00Z',
  lastLoss: '2026-04-01T10:00:00Z',
  lastActivitySummary: '10m ago',
  freshness: 'fresh',
  tags: ['FC', 'Cloaky'],
  notes: '',
  lastSeen: '10:10',
  status: 'ready',
  dataCompletenessMarkers: [],
};

function buildVisibility(overrides: Partial<Record<ThreatTableColumn, boolean>> = {}): Record<ThreatTableColumn, boolean> {
  const defaults = Object.fromEntries(THREAT_TABLE_COLUMN_SCHEMA.map((column) => [column.key, column.visibleByDefault])) as Record<ThreatTableColumn, boolean>;
  return { ...defaults, ...overrides };
}

function renderTable(rows: ThreatRowView[], visibleColumns = buildVisibility()) {
  return render(
    <VirtualThreatTable
      rows={rows}
      selectedRowId={rows[0]?.id ?? null}
      compactMode
      sortBy="score"
      sortDirection="desc"
      filterText=""
      visibleColumns={visibleColumns}
      onRowSelect={vi.fn()}
      onRowTogglePin={vi.fn()}
      onSortChange={vi.fn()}
      isPinned={() => false}
      scrollParentRef={{ current: null }}
    />,
  );
}

describe('ThreatTable column schema contract', () => {
  it('uses the expected default visible column set', () => {
    const visibleKeys = getThreatTableVisibleColumnKeys(buildVisibility());
    expect(visibleKeys).toEqual([
      'pilotName',
      'corp',
      'alliance',
      'score',
      'threatBand',
      'kl',
      'dangerPercent',
      'lastActivity',
      'mainShip',
      'tags',
    ]);
  });

  it('keeps hidden-by-default columns available through visibility config', () => {
    const defaults = getThreatTableVisibleColumnKeys(buildVisibility());
    expect(defaults).not.toContain('notes');
    expect(defaults).not.toContain('soloPercent');
    expect(defaults).not.toContain('avgGangSize');

    const enabled = getThreatTableVisibleColumnKeys(buildVisibility({ notes: true, soloPercent: true, avgGangSize: true }));
    expect(enabled).toContain('notes');
    expect(enabled).toContain('soloPercent');
    expect(enabled).toContain('avgGangSize');
  });

  it('defines deterministic width rules for all default-visible columns', () => {
    const active = computeThreatTableColumns(buildVisibility());
    const visible = active.filter((column) => column.visible);

    expect(visible.length).toBeGreaterThan(0);
    for (const column of visible) {
      expect(Number.isFinite(column.pixelWidth)).toBe(true);
      expect(column.pixelWidth).toBeGreaterThanOrEqual(column.minWidth);
      expect(column.pixelWidth).toBeLessThanOrEqual(column.maxWidth);
    }
  });

  it('keeps header/body ordered visible columns identical', () => {
    renderTable([baseRow], buildVisibility({ alliance: true, notes: true }));

    const table = screen.getByTestId('threat-table');
    const headerKeys = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.getAttribute('data-column-key'));

    const firstBodyRow = within(table).getAllByRole('row')[1]!;
    const bodyKeys = within(firstBodyRow)
      .getAllByRole('cell')
      .map((cell) => cell.getAttribute('data-column-key'));

    expect(bodyKeys).toEqual(headerKeys);
    expect(headerKeys).toEqual(getThreatTableVisibleColumnKeys(buildVisibility({ alliance: true, notes: true })));
  });

  it('keeps computed width map stable for long truncating content', () => {
    const longRow: ThreatRowView = {
      ...baseRow,
      id: 'pilot-2',
      corp: 'X'.repeat(200),
      alliance: 'Y'.repeat(200),
      tags: ['TAG'.repeat(80)],
    };

    const firstRender = renderTable([baseRow]);
    const baseTable = screen.getByTestId('threat-table');
    const baseHeaderWidths = within(baseTable)
      .getAllByRole('columnheader')
      .map((header) => header.getAttribute('data-column-width'));

    firstRender.unmount();
    renderTable([longRow]);
    const longTable = screen.getByTestId('threat-table');
    const longHeaderWidths = within(longTable)
      .getAllByRole('columnheader')
      .map((header) => header.getAttribute('data-column-width'));

    expect(longHeaderWidths).toEqual(baseHeaderWidths);

    const truncatingCells = within(longTable).getAllByRole('cell').filter((cell) => cell.className.includes('threat-table-cell--truncate'));
    expect(truncatingCells.length).toBeGreaterThan(0);
  });

  it('preserves header/body width and key alignment on column visibility toggles', () => {
    const withHidden = buildVisibility({ alliance: false, notes: false, corp: true, tags: true });
    const visibleKeys = getThreatTableVisibleColumnKeys(withHidden);
    const widthMap = getThreatTableWidthMap(withHidden);

    renderTable([baseRow], withHidden);

    const table = screen.getByTestId('threat-table');
    const headers = within(table).getAllByRole('columnheader');
    const firstBodyRow = within(table).getAllByRole('row')[1]!;
    const cells = within(firstBodyRow).getAllByRole('cell');

    expect(headers.map((header) => header.getAttribute('data-column-key'))).toEqual(visibleKeys);
    expect(cells.map((cell) => cell.getAttribute('data-column-key'))).toEqual(visibleKeys);

    expect(headers.map((header) => Number(header.getAttribute('data-column-width')))).toEqual(
      visibleKeys.map((key) => widthMap[key]),
    );
    expect(cells.map((cell) => Number(cell.getAttribute('data-column-width')))).toEqual(
      visibleKeys.map((key) => widthMap[key]),
    );
  });
});
