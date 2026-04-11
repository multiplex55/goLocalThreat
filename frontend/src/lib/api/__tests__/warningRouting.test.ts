import { describe, expect, it } from 'vitest';
import { toAnalysisSessionView } from '../adapter';

describe('warning routing', () => {
  it('partitions global and pilot-scoped warnings', () => {
    const mapped = toAnalysisSessionView({
      sessionId: 'session-routing',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      source: {
        rawText: 'Pilot',
        normalizedText: 'Pilot',
        parsedCharacters: [],
        candidateNames: ['Pilot'],
        invalidLines: [],
        warnings: [],
        inputKind: 'local_member_list',
        confidence: 1,
        removedDuplicates: 0,
        suspiciousArtifacts: 0,
        parsedAt: '2026-01-01T00:00:00Z',
      },
      pilots: [{
        identity: { characterId: 42, name: 'Pilot', corpId: 0, allianceId: 0 },
        threat: { threatScore: 1, threatBand: 'low', threatReasons: [], confidence: 1 },
        pilot: 'Pilot', corp: '', alliance: '', threatScore: 1, threatBand: 'low', kills: 0, losses: 0, dangerPercent: 0, soloPercent: 0, avgGangSize: 0, lastKill: '', lastLoss: '', mainShip: '', notes: '', tags: [], lastUpdated: '', freshness: { source: '', dataAsOf: '', isStale: false },
      }],
      settings: { ignoredCorps: [], ignoredAlliances: [], pinnedPilots: [], refreshInterval: 30, scoring: { weights: { activity: 1, lethality: 1, soloRisk: 1, recentness: 1, context: 1, uncertainty: 1 }, thresholds: { low: 20, medium: 40, high: 70, critical: 90 } } },
      warnings: [
        { provider: 'zkill', code: 'DETAIL_TIME_INVALID', message: 'Partial zKill timestamps', characterId: 42, characterName: 'Pilot', severity: 'info', userVisible: false, category: 'data_quality' },
        { provider: 'zkill', code: 'DETAIL_TIME_MISSING', message: 'Recent activity timing incomplete', severity: 'warn', userVisible: true, category: 'data_quality' },
      ],
      freshness: { source: 'composite', dataAsOf: '2026-01-01T00:00:00Z', isStale: false },
    });

    expect(mapped.diagnostics.globalWarnings).toHaveLength(1);
    expect(mapped.diagnostics.globalWarnings[0]?.code).toBe('DETAIL_TIME_MISSING');
    expect(mapped.diagnostics.warningsByPilotId['42']).toHaveLength(1);
    expect(mapped.pilots[0]?.warnings[0]?.code).toBe('DETAIL_TIME_INVALID');
  });

  it('keeps pilot-scoped data-quality warnings off the global channel', () => {
    const mapped = toAnalysisSessionView({
      sessionId: 'session-routing-2',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      source: {
        rawText: 'Pilot',
        normalizedText: 'Pilot',
        parsedCharacters: [],
        candidateNames: ['Pilot'],
        invalidLines: [],
        warnings: [],
        inputKind: 'local_member_list',
        confidence: 1,
        removedDuplicates: 0,
        suspiciousArtifacts: 0,
        parsedAt: '2026-01-01T00:00:00Z',
      },
      pilots: [{
        identity: { characterId: 7, name: 'Pilot', corpId: 0, allianceId: 0 },
        threat: { threatScore: 1, threatBand: 'low', threatReasons: [], confidence: 1 },
        pilot: 'Pilot', corp: '', alliance: '', threatScore: 1, threatBand: 'low', kills: 0, losses: 0, dangerPercent: 0, soloPercent: 0, avgGangSize: 0, lastKill: '', lastLoss: '', mainShip: '', notes: '', tags: [], lastUpdated: '', freshness: { source: '', dataAsOf: '', isStale: false },
      }],
      settings: { ignoredCorps: [], ignoredAlliances: [], pinnedPilots: [], refreshInterval: 30, scoring: { weights: { activity: 1, lethality: 1, soloRisk: 1, recentness: 1, context: 1, uncertainty: 1 }, thresholds: { low: 20, medium: 40, high: 70, critical: 90 } } },
      warnings: [
        { provider: 'zkill', code: 'DETAIL_TIME_INVALID', message: 'Partial zKill timestamps', characterId: 7, characterName: 'Pilot', severity: 'info', userVisible: false, category: 'data_quality' },
      ],
      freshness: { source: 'composite', dataAsOf: '2026-01-01T00:00:00Z', isStale: false },
    });

    expect(mapped.diagnostics.globalWarnings).toHaveLength(0);
    expect(mapped.diagnostics.warningsByPilotId['7']).toHaveLength(1);
  });
});
