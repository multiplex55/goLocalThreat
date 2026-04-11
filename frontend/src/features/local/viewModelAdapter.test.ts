import { describe, expect, it } from 'vitest';
import { toLocalScreenViewModel } from './viewModelAdapter';

describe('local view-model adapter', () => {
  it('reuses canonical api mapper and threat row mapper with backend values intact', () => {
    const model = toLocalScreenViewModel({
      sessionId: 's',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      source: { rawText: 'A', normalizedText: 'A', parsedCharacters: [], candidateNames: ['A'], invalidLines: [], warnings: [], inputKind: 'local_member_list', confidence: 1, removedDuplicates: 0, suspiciousArtifacts: 0, parsedAt: '2026-01-01T00:00:00Z' },
      pilots: [{
        identity: { characterId: 99, name: 'Pilot Legacy', corpId: 1, corpName: 'Old Corp', allianceId: 2, allianceName: 'Old Alliance' },
        threat: { threatScore: 0, threatBand: 'unknown', threatReasons: [], confidence: 1, recentKills: 0, recentLosses: 0, dangerPercent: 0, soloPercent: 0, avgGangSize: 0, mainShip: '' },
        pilot: 'Pilot Legacy', corp: 'Old Corp', alliance: 'Old Alliance', threatScore: 73, threatBand: 'high', kills: 9, losses: 3, dangerPercent: 66.6, soloPercent: 21.2, avgGangSize: 3.4, lastKill: '2026-04-10T12:34:56Z', lastLoss: '', mainShip: 'Orthrus', notes: 'Watched gatecamp', tags: [], lastUpdated: '', freshness: { source: '', dataAsOf: '', isStale: false },
      }],
      settings: { ignoredCorps: [], ignoredAlliances: [], pinnedPilots: [], refreshInterval: 30, scoring: { weights: { activity: 1, lethality: 1, soloRisk: 1, recentness: 1, context: 1, uncertainty: 1 }, thresholds: { low: 20, medium: 40, high: 70, critical: 90 } } },
      warnings: [],
      freshness: { source: 'composite', dataAsOf: '2026-01-01T00:00:00Z', isStale: false },
    });

    expect(model.rows[0]?.id).toBe('99');
    expect(model.rows[0]?.pilotName).toBe('Pilot Legacy');
    expect(model.rows[0]?.kills).toBe(9);
    expect(model.rows[0]?.losses).toBe(3);
    expect(model.rows[0]?.dangerPercent).toBe(66.6);
    expect(model.rows[0]?.soloPercent).toBe(21.2);
    expect(model.rows[0]?.avgGangSize).toBe(3.4);
    expect(model.rows[0]?.mainShip).toBe('Orthrus');
    expect(model.rows[0]?.score).toBe(73);
    expect(model.rows[0]?.threatBand).toBe('high');
  });
});
