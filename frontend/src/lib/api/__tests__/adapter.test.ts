import { describe, expect, it } from 'vitest';
import { toAnalysisSessionView } from '../adapter';

describe('api adapter', () => {
  it('verifies rich mapping for a fully-populated pilot dto', () => {
    const mapped = toAnalysisSessionView({
      sessionId: 'session-1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      source: {
        rawText: 'Alpha',
        normalizedText: 'Alpha',
        parsedCharacters: [],
        candidateNames: ['Alpha'],
        invalidLines: [],
        warnings: [],
        inputKind: 'local_member_list',
        confidence: 0.9,
        removedDuplicates: 0,
        suspiciousArtifacts: 0,
        parsedAt: '2026-01-01T00:00:00Z',
      },
      pilots: [{
        identity: { characterId: 777, name: 'Alpha', corpId: 1, corpName: 'A Corp', corpTicker: 'A', allianceId: 2, allianceName: 'A Alliance', allianceTicker: 'AA' },
        threat: { threatScore: 65, threatBand: 'high', threatReasons: ['active'], confidence: 0.7, recentKills: 11, recentLosses: 2, dangerPercent: 85, soloPercent: 45, avgGangSize: 3, lastKill: '2026-01-02T00:00:00Z', lastLoss: '2025-12-02T00:00:00Z', mainShip: 'Loki', notes: 'camping' },
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
      }],
      settings: { ignoredCorps: [], ignoredAlliances: [], pinnedPilots: [], refreshInterval: 30, scoring: { weights: { activity: 1, lethality: 1, soloRisk: 1, recentness: 1, context: 1, uncertainty: 1 }, thresholds: { low: 20, medium: 40, high: 70, critical: 90 } } },
      warnings: [{ provider: 'zkill', code: 'PARTIAL', message: 'partial', characterId: 777 }],
      freshness: { source: 'composite', dataAsOf: '2026-01-01T00:00:00Z', isStale: false },
      unresolvedNames: [],
    });

    expect(mapped.pilots[0]).toEqual({
      id: '777',
      identity: {
        characterId: 777,
        characterName: 'Alpha',
        corporationName: 'A Corp',
        corporationTicker: 'A',
        allianceName: 'A Alliance',
        allianceTicker: 'AA',
        portraitUrl: null,
        metadata: { corporationId: 1, allianceId: 2 },
      },
      score: 65,
      band: 'high',
      confidence: 0.7,
      reasons: ['active'],
      tags: ['hunter'],
      notes: 'camping',
      kills: 11,
      losses: 2,
      dangerPercent: 85,
      soloPercent: 45,
      avgGangSize: 3,
      mainShip: 'Loki',
      lastKill: '2026-01-02T00:00:00Z',
      lastLoss: '2025-12-02T00:00:00Z',
      freshness: { source: 'zkill', dataAsOf: '2026-01-01T00:00:00Z', isStale: false },
      warnings: [{ provider: 'zkill', code: 'PARTIAL', message: 'partial', characterId: 777, severity: 'info', userVisible: true, category: 'provider' }],
    });
  });

  it('verifies null/partial data mapping preserves null', () => {
    const mapped = toAnalysisSessionView({
      sessionId: 'session-2',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      source: { rawText: 'Gamma', normalizedText: 'Gamma', parsedCharacters: [], candidateNames: ['Gamma'], invalidLines: [], warnings: [], inputKind: 'local_member_list', confidence: 0.9, removedDuplicates: 0, suspiciousArtifacts: 0, parsedAt: '2026-01-01T00:00:00Z' },
      pilots: [{
        identity: { characterId: 1, name: 'Gamma', corpId: 0, allianceId: 0 },
        threat: { threatScore: 0, threatBand: 'unknown', threatReasons: [], confidence: 0 },
        pilot: 'Gamma', corp: '', alliance: '', threatScore: 0, threatBand: 'unknown', kills: 0, losses: 0, dangerPercent: 0, soloPercent: 0, avgGangSize: 0, lastKill: '', lastLoss: '', mainShip: '', notes: '', tags: [], lastUpdated: '', freshness: { source: '', dataAsOf: '', isStale: false },
      }],
      settings: { ignoredCorps: [], ignoredAlliances: [], pinnedPilots: [], refreshInterval: 30, scoring: { weights: { activity: 1, lethality: 1, soloRisk: 1, recentness: 1, context: 1, uncertainty: 1 }, thresholds: { low: 20, medium: 40, high: 70, critical: 90 } } },
      warnings: [],
      freshness: { source: 'composite', dataAsOf: '2026-01-01T00:00:00Z', isStale: false },
    });

    expect(mapped.pilots[0]?.identity.corporationName).toBeNull();
    expect(mapped.pilots[0]?.mainShip).toBeNull();
  });

  it('maps zero timestamps to null', () => {
    const mapped = toAnalysisSessionView({
      sessionId: 'session-4',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      source: { rawText: 'Delta', normalizedText: 'Delta', parsedCharacters: [], candidateNames: ['Delta'], invalidLines: [], warnings: [], inputKind: 'local_member_list', confidence: 1, removedDuplicates: 0, suspiciousArtifacts: 0, parsedAt: '2026-01-01T00:00:00Z' },
      pilots: [{
        identity: { characterId: 4, name: 'Delta', corpId: 0, allianceId: 0 },
        threat: { threatScore: 10, threatBand: 'low', threatReasons: [], confidence: 1, lastKill: '0001-01-01T00:00:00Z', lastLoss: '0001-01-01T05:33:22Z' },
        pilot: 'Delta', corp: '', alliance: '', threatScore: 10, threatBand: 'low', kills: 0, losses: 0, dangerPercent: 0, soloPercent: 0, avgGangSize: 0, lastKill: '0001-01-01T00:00:00Z', lastLoss: '0001-01-01T00:00:00Z', mainShip: '', notes: '', tags: [], lastUpdated: '', freshness: { source: 'zkill', dataAsOf: '0001-01-01T00:00:00Z', isStale: false },
      }],
      settings: { ignoredCorps: [], ignoredAlliances: [], pinnedPilots: [], refreshInterval: 30, scoring: { weights: { activity: 1, lethality: 1, soloRisk: 1, recentness: 1, context: 1, uncertainty: 1 }, thresholds: { low: 20, medium: 40, high: 70, critical: 90 } } },
      warnings: [],
      freshness: { source: 'composite', dataAsOf: '2026-01-01T00:00:00Z', isStale: false },
    });

    expect(mapped.pilots[0]?.lastKill).toBeNull();
    expect(mapped.pilots[0]?.lastLoss).toBeNull();
    expect(mapped.pilots[0]?.freshness.dataAsOf).toBeNull();
  });

  it('keeps real timestamps unchanged', () => {
    const mapped = toAnalysisSessionView({
      sessionId: 'session-5',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      source: { rawText: 'Echo', normalizedText: 'Echo', parsedCharacters: [], candidateNames: ['Echo'], invalidLines: [], warnings: [], inputKind: 'local_member_list', confidence: 1, removedDuplicates: 0, suspiciousArtifacts: 0, parsedAt: '2026-01-01T00:00:00Z' },
      pilots: [{
        identity: { characterId: 5, name: 'Echo', corpId: 0, allianceId: 0 },
        threat: { threatScore: 10, threatBand: 'low', threatReasons: [], confidence: 1, lastKill: '2026-04-10T00:00:00Z', lastLoss: '2026-04-09T00:00:00Z' },
        pilot: 'Echo', corp: '', alliance: '', threatScore: 10, threatBand: 'low', kills: 0, losses: 0, dangerPercent: 0, soloPercent: 0, avgGangSize: 0, lastKill: '2026-04-10T00:00:00Z', lastLoss: '2026-04-09T00:00:00Z', mainShip: '', notes: '', tags: [], lastUpdated: '', freshness: { source: 'zkill', dataAsOf: '2026-04-11T00:00:00Z', isStale: false },
      }],
      settings: { ignoredCorps: [], ignoredAlliances: [], pinnedPilots: [], refreshInterval: 30, scoring: { weights: { activity: 1, lethality: 1, soloRisk: 1, recentness: 1, context: 1, uncertainty: 1 }, thresholds: { low: 20, medium: 40, high: 70, critical: 90 } } },
      warnings: [],
      freshness: { source: 'composite', dataAsOf: '2026-01-01T00:00:00Z', isStale: false },
    });

    expect(mapped.pilots[0]?.lastKill).toBe('2026-04-10T00:00:00Z');
    expect(mapped.pilots[0]?.lastLoss).toBe('2026-04-09T00:00:00Z');
    expect(mapped.pilots[0]?.freshness.dataAsOf).toBe('2026-04-11T00:00:00Z');
  });

  it('preserves non-zero dto stats when nested threat values are default zeros', () => {
    const mapped = toAnalysisSessionView({
      sessionId: 'session-6',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      source: { rawText: 'Foxtrot', normalizedText: 'Foxtrot', parsedCharacters: [], candidateNames: ['Foxtrot'], invalidLines: [], warnings: [], inputKind: 'local_member_list', confidence: 1, removedDuplicates: 0, suspiciousArtifacts: 0, parsedAt: '2026-01-01T00:00:00Z' },
      pilots: [{
        identity: { characterId: 6, name: 'Foxtrot', corpId: 0, allianceId: 0 },
        threat: { threatScore: 0, threatBand: 'unknown', threatReasons: [], confidence: 1, recentKills: 0, recentLosses: 0, dangerPercent: 0, soloPercent: 0, avgGangSize: 0, mainShip: '' },
        pilot: 'Foxtrot', corp: '', alliance: '', threatScore: 88, threatBand: 'high', kills: 21, losses: 4, dangerPercent: 92, soloPercent: 77, avgGangSize: 5.5, lastKill: '', lastLoss: '', mainShip: 'Sabre', notes: '', tags: [], lastUpdated: '', freshness: { source: 'zkill', dataAsOf: '2026-04-11T00:00:00Z', isStale: false },
      }],
      settings: { ignoredCorps: [], ignoredAlliances: [], pinnedPilots: [], refreshInterval: 30, scoring: { weights: { activity: 1, lethality: 1, soloRisk: 1, recentness: 1, context: 1, uncertainty: 1 }, thresholds: { low: 20, medium: 40, high: 70, critical: 90 } } },
      warnings: [],
      freshness: { source: 'composite', dataAsOf: '2026-01-01T00:00:00Z', isStale: false },
    });

    expect(mapped.pilots[0]?.kills).toBe(21);
    expect(mapped.pilots[0]?.losses).toBe(4);
    expect(mapped.pilots[0]?.dangerPercent).toBe(92);
    expect(mapped.pilots[0]?.soloPercent).toBe(77);
    expect(mapped.pilots[0]?.avgGangSize).toBe(5.5);
    expect(mapped.pilots[0]?.mainShip).toBe('Sabre');
    expect(mapped.pilots[0]?.score).toBe(88);
    expect(mapped.pilots[0]?.band).toBe('high');
  });

  it('verifies warnings are preserved and attached per pilot', () => {
    const mapped = toAnalysisSessionView({
      sessionId: 'session-3',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      source: { rawText: 'A', normalizedText: 'A', parsedCharacters: [], candidateNames: ['A'], invalidLines: [], warnings: [], inputKind: 'local_member_list', confidence: 1, removedDuplicates: 0, suspiciousArtifacts: 0, parsedAt: '2026-01-01T00:00:00Z' },
      pilots: [{
        identity: { characterId: 42, name: 'Pilot', corpId: 1, allianceId: 1 },
        threat: { threatScore: 1, threatBand: 'low', threatReasons: [], confidence: 1 },
        pilot: 'Pilot', corp: '', alliance: '', threatScore: 1, threatBand: 'low', kills: 0, losses: 0, dangerPercent: 0, soloPercent: 0, avgGangSize: 0, lastKill: '', lastLoss: '', mainShip: '', notes: '', tags: [], lastUpdated: '', freshness: { source: '', dataAsOf: '', isStale: false },
      }],
      settings: { ignoredCorps: [], ignoredAlliances: [], pinnedPilots: [], refreshInterval: 30, scoring: { weights: { activity: 1, lethality: 1, soloRisk: 1, recentness: 1, context: 1, uncertainty: 1 }, thresholds: { low: 20, medium: 40, high: 70, critical: 90 } } },
      warnings: [{ provider: 'esi', code: 'WARN', message: 'pilot scoped', characterId: 42 }],
      freshness: { source: 'composite', dataAsOf: '2026-01-01T00:00:00Z', isStale: false },
    });

    expect(mapped.diagnostics.warningsByPilotId['42']).toHaveLength(1);
    expect(mapped.pilots[0]?.warnings).toHaveLength(1);
    expect(mapped.pilots[0]?.warnings[0]?.message).toBe('pilot scoped');
  });
});
