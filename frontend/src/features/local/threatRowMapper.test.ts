import { describe, expect, it } from 'vitest';
import type { PilotThreatView } from '../../types/analysis';
import { toThreatRowView } from './threatRowMapper';

function makePilot(overrides: Partial<PilotThreatView> = {}): PilotThreatView {
  return {
    id: '1',
    identity: {
      characterId: 1,
      characterName: 'Pilot',
      corporationName: 'Corp',
      corporationTicker: null,
      allianceName: 'Alliance',
      allianceTicker: null,
      portraitUrl: null,
      metadata: { corporationId: 1, allianceId: 1 },
    },
    score: 75,
    band: 'high',
    confidence: 0.8,
    reasons: ['Recent kills'],
    tags: [],
    notes: null,
    kills: 5,
    losses: 1,
    dangerPercent: 62,
    soloPercent: 31,
    avgGangSize: 2.3,
    mainShip: 'Orthrus',
    lastKill: '2026-04-10T12:00:00Z',
    lastLoss: '2026-04-09T12:00:00Z',
    freshness: { source: 'zkill', dataAsOf: '2026-04-11T00:00:00Z', isStale: false },
    warnings: [],
    ...overrides,
  };
}

describe('threatRowMapper', () => {
  it('maps known values as known provenance and uses activity timestamps for lastSeen', () => {
    const row = toThreatRowView(makePilot(), 'ready');
    expect(row.provenance).toMatchObject({
      mainShip: 'known',
      dangerPercent: 'known',
      soloPercent: 'known',
      lastSeen: 'known',
      fallbackSource: null,
    });
    expect(row.lastSeen).toBe('2026-04-10T12:00:00Z');
  });

  it('maps unknown summary-only values to null placeholders', () => {
    const row = toThreatRowView(makePilot({
      reasons: [],
      warnings: [{ code: 'SUMMARY_ONLY', message: 'summary only', severity: 'warn', userVisible: true, category: 'provider', normalizedLabel: 'Derived from summary only' }],
      mainShip: null,
      dangerPercent: 99,
      soloPercent: 88,
      lastKill: null,
      lastLoss: null,
    }), 'ready');

    expect(row.mainShip).toBeNull();
    expect(row.dangerPercent).toBeNull();
    expect(row.soloPercent).toBeNull();
    expect(row.provenance?.mainShip).toBe('unknown');
    expect(row.provenance?.dangerPercent).toBe('unknown');
    expect(row.provenance?.soloPercent).toBe('unknown');
    expect(row.dataCompletenessMarkers).toContain('Derived from summary only');
  });

  it('maps partial completeness warnings to partial provenance indicators', () => {
    const row = toThreatRowView(makePilot({
      lastKill: '2026-04-10T12:00:00Z',
      warnings: [{ code: 'DETAIL_TIME_INVALID', message: 'partial', severity: 'warn', userVisible: true, category: 'data_quality', normalizedLabel: 'Partial timestamps' }],
    }), 'ready');

    expect(row.lastSeen).toBe('2026-04-10T12:00:00Z');
    expect(row.provenance?.lastSeen).toBe('partial');
    expect(row.dataCompletenessMarkers).toContain('Partial timestamps');
  });

  it('tracks fallback sources as explicit markers', () => {
    const row = toThreatRowView(makePilot({
      freshness: { source: 'composite', dataAsOf: '2026-04-11T00:00:00Z', isStale: false },
    }), 'ready');

    expect(row.provenance?.mainShip).toBe('fallback');
    expect(row.provenance?.dangerPercent).toBe('fallback');
    expect(row.provenance?.soloPercent).toBe('fallback');
    expect(row.provenance?.fallbackSource).toBe('composite');
    expect(row.dataCompletenessMarkers).toContain('Fallback source: composite');
  });
});
