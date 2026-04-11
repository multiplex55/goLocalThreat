import { describe, expect, it } from 'vitest';
import { toAnalysisSessionView } from '../adapter';
import type { AnalysisSessionDTO, PilotThreatDTO } from '../../../../wailsjs/go/app/AppService';

function buildPilot(overrides: Partial<PilotThreatDTO> = {}): PilotThreatDTO {
  const baseThreat = {
    threatScore: 65,
    threatBand: 'high',
    threatReasons: ['active'],
    confidence: 0.7,
    recentKills: 11,
    recentLosses: 2,
    dangerPercent: 85,
    soloPercent: 45,
    avgGangSize: 3,
    lastKill: '2026-01-02T00:00:00Z',
    lastLoss: '2025-12-02T00:00:00Z',
    mainShip: 'Loki',
    notes: 'camping',
  };

  return {
    identity: { characterId: 777, name: 'Alpha', corpId: 1, corpName: 'A Corp', corpTicker: 'A', allianceId: 2, allianceName: 'A Alliance', allianceTicker: 'AA' },
    pilot: 'Alpha',
    corp: 'A Corp',
    alliance: 'A Alliance',
    threatScore: 65,
    threatBand: 'high',
    kills: 11,
    losses: 2,
    dangerPercent: 85,
    soloPercent: 45,
    avgGangSize: 3,
    lastKill: '2026-01-02T00:00:00Z',
    lastLoss: '2025-12-02T00:00:00Z',
    mainShip: 'Loki',
    notes: 'camping',
    tags: ['hunter'],
    lastUpdated: '2026-01-01T00:00:00Z',
    freshness: { source: 'zkill', dataAsOf: '2026-01-01T00:00:00Z', isStale: false },
    ...overrides,
    threat: { ...baseThreat, ...(overrides.threat ?? {}) },
  };
}

function mapPilot(pilot: PilotThreatDTO) {
  const dto: AnalysisSessionDTO = {
    sessionId: 'session-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    source: {
      rawText: 'Alpha', normalizedText: 'Alpha', parsedCharacters: [], candidateNames: ['Alpha'], invalidLines: [], warnings: [], inputKind: 'local_member_list', confidence: 0.9, removedDuplicates: 0, suspiciousArtifacts: 0, parsedAt: '2026-01-01T00:00:00Z',
    },
    pilots: [pilot],
    settings: { ignoredCorps: [], ignoredAlliances: [], pinnedPilots: [], refreshInterval: 30, scoring: { weights: { activity: 1, lethality: 1, soloRisk: 1, recentness: 1, context: 1, uncertainty: 1 }, thresholds: { low: 20, medium: 40, high: 70, critical: 90 } } },
    warnings: [],
    freshness: { source: 'composite', dataAsOf: '2026-01-01T00:00:00Z', isStale: false },
  };

  return toAnalysisSessionView(dto).pilots[0];
}

describe('api adapter metric mapping', () => {
  it('maps each key metric with explicit detail-first fallback', () => {
    const mapped = mapPilot(buildPilot());

    expect(mapped.kills).toBe(11);
    expect(mapped.losses).toBe(2);
    expect(mapped.dangerPercent).toBe(85);
    expect(mapped.soloPercent).toBe(45);
    expect(mapped.avgGangSize).toBe(3);
    expect(mapped.mainShip).toBe('Loki');
    expect(mapped.lastKill).toBe('2026-01-02T00:00:00Z');
    expect(mapped.lastLoss).toBe('2025-12-02T00:00:00Z');
  });

  it('does not let nullish detail overwrite valid summary metrics', () => {
    const mapped = mapPilot(buildPilot({
      threat: {
        threatScore: 60,
        threatBand: 'medium',
        threatReasons: [],
        confidence: 1,
        recentKills: undefined,
        recentLosses: undefined,
        dangerPercent: undefined,
        soloPercent: undefined,
        avgGangSize: undefined,
        mainShip: '',
        lastKill: '',
        lastLoss: undefined,
      },
      kills: 12,
      losses: 5,
      dangerPercent: 61,
      soloPercent: 40,
      avgGangSize: 2.6,
      mainShip: 'Sabre',
      lastKill: '2026-02-01T01:02:03Z',
      lastLoss: '2026-02-02T01:02:03Z',
    }));

    expect(mapped.kills).toBe(12);
    expect(mapped.losses).toBe(5);
    expect(mapped.dangerPercent).toBe(61);
    expect(mapped.soloPercent).toBe(40);
    expect(mapped.avgGangSize).toBe(2.6);
    expect(mapped.mainShip).toBe('Sabre');
    expect(mapped.lastKill).toBe('2026-02-01T01:02:03Z');
    expect(mapped.lastLoss).toBe('2026-02-02T01:02:03Z');
  });

  it('preserves true zero values from detail instead of promoting summary activity', () => {
    const mapped = mapPilot(buildPilot({
      threat: { threatScore: 60, threatBand: 'medium', threatReasons: [], confidence: 1, recentKills: 0, recentLosses: 0, dangerPercent: 0, soloPercent: 0, avgGangSize: 0, mainShip: 'Vexor', lastKill: '2026-03-01T00:00:00Z', lastLoss: '2026-02-20T00:00:00Z' },
      kills: 99,
      losses: 88,
      dangerPercent: 77,
      soloPercent: 66,
      avgGangSize: 5,
    }));

    expect(mapped.kills).toBe(0);
    expect(mapped.losses).toBe(0);
    expect(mapped.dangerPercent).toBe(0);
    expect(mapped.soloPercent).toBe(0);
    expect(mapped.avgGangSize).toBe(0);
  });

  it('distinguishes 0 vs null vs undefined for UI-facing metric fields', () => {
    const zeroMapped = mapPilot(buildPilot({ threat: { threatScore: 30, threatBand: 'low', threatReasons: [], confidence: 1, recentKills: 0 } }));
    const nullMapped = mapPilot(buildPilot({ threat: { threatScore: 30, threatBand: 'low', threatReasons: [], confidence: 1, mainShip: '' }, mainShip: '' }));
    const undefinedMapped = mapPilot(buildPilot({
      threat: { threatScore: 0, threatBand: 'unknown', threatReasons: [], confidence: 1, recentKills: undefined },
      kills: undefined as unknown as number,
    }));

    expect(zeroMapped.kills).toBe(0);
    expect(nullMapped.mainShip).toBeNull();
    expect(undefinedMapped.kills).toBeUndefined();
  });

  it('normalizes zero-value timestamps to null', () => {
    const mapped = mapPilot(buildPilot({
      threat: { threatScore: 10, threatBand: 'low', threatReasons: [], confidence: 1, lastKill: '0001-01-01T00:00:00Z', lastLoss: '0001-01-01T05:33:22Z' },
      lastKill: '0001-01-01T00:00:00Z',
      lastLoss: '0001-01-01T00:00:00Z',
    }));

    expect(mapped.lastKill).toBeNull();
    expect(mapped.lastLoss).toBeNull();
  });

  it('guards score-with-all-zero-submetrics anomaly by downgrading zero metrics to unknown', () => {
    const mapped = mapPilot(buildPilot({
      threat: {
        threatScore: 78,
        threatBand: 'high',
        threatReasons: ['composite'],
        confidence: 0.6,
        recentKills: 0,
        recentLosses: 0,
        dangerPercent: 0,
        soloPercent: 0,
        avgGangSize: 0,
        mainShip: '',
        lastKill: '',
        lastLoss: '',
      },
      kills: 0,
      losses: 0,
      dangerPercent: 0,
      soloPercent: 0,
      avgGangSize: 0,
      mainShip: '',
      lastKill: '',
      lastLoss: '',
    }));

    expect(mapped.score).toBe(78);
    expect(mapped.kills).toBeNull();
    expect(mapped.losses).toBeNull();
    expect(mapped.dangerPercent).toBeNull();
    expect(mapped.soloPercent).toBeNull();
    expect(mapped.avgGangSize).toBeNull();
  });
});
