import { describe, expect, it } from 'vitest';
import { buildThreatTableRow } from '../ThreatTableRow';
import { normalizeTagLabel, normalizeTagsForGrid } from '../TagPill';
import type { ThreatRowView } from '../types';

function makeRow(tags: string[]): ThreatRowView {
  return {
    id: 'pilot-tags',
    pilotName: 'Tags',
    corp: 'Corp',
    alliance: 'Alliance',
    mainShip: 'Sabre',
    mainRecentShip: 'Sabre',
    score: 50,
    threatBand: 'medium',
    confidence: 0.5,
    reasonBreakdown: [{ label: 'Active pings', score: 5 }],
    kills: 2,
    losses: 1,
    dangerPercent: 50,
    soloPercent: 20,
    avgGangSize: 3,
    soloGangTendency: 'mixed',
    lastKill: null,
    lastLoss: null,
    lastActivitySummary: '',
    freshness: null,
    tags,
    notes: '',
    lastSeen: null,
    status: 'ready',
    dataCompletenessMarkers: [],
  };
}

describe('ThreatTableRow tag rendering', () => {
  it('handles 0/1/2/3+ tags and +N overflow count', () => {
    expect(buildThreatTableRow(makeRow([]), false, false).tagCell.visible).toHaveLength(0);
    expect(buildThreatTableRow(makeRow(['fc']), false, false).tagCell.visible.map((tag) => tag.label)).toEqual(['FC']);
    expect(buildThreatTableRow(makeRow(['fc', 'cyno']), false, false).tagCell.visible.map((tag) => tag.label)).toEqual(['FC', 'Cyno']);

    const overflow = buildThreatTableRow(makeRow(['fc', 'cyno', 'cloaky', 'solo']), false, false);
    expect(overflow.tagCell.visible.map((tag) => tag.label)).toEqual(['FC', 'Cyno']);
    expect(overflow.tagCell.overflowCount).toBe(2);
  });

  it('filters long/non-categorical prose before grid rendering', () => {
    const tags = normalizeTagsForGrid([
      'FC',
      'Threat score combines combat activity over multiple windows and may be stale.',
      'Uncertain due to missing records from provider fallback.',
      'summary',
    ]);

    expect(tags).toEqual(['FC', 'Summary-only']);
    expect(normalizeTagLabel('paragraph: this should never be a pill')).toBeNull();
  });

  it('stores full tags and rationale in tooltip payload', () => {
    const rendered = buildThreatTableRow(
      makeRow(['FC', 'Long fallback explanation from provider with uncertain attribution']),
      false,
      false,
    );

    expect(rendered.tagCell.tooltip).toContain('Long fallback explanation');
    expect(rendered.tagCell.tooltip).toContain('Rationale: Active pings (+5)');
    expect(rendered.tagCell.visible.map((tag) => tag.label)).toEqual(['FC']);
  });

  it('keeps a stable row class regardless of tag count', () => {
    const none = buildThreatTableRow(makeRow([]), false, true);
    const many = buildThreatTableRow(makeRow(['fc', 'cyno', 'cloaky', 'solo']), false, true);

    expect(none.rowClassName).toBe(many.rowClassName);
    expect(none.rowClassName).toContain('is-compact');
  });
});
