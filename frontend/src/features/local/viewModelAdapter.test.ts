import { describe, expect, it } from 'vitest';
import { toLocalScreenViewModel, toThreatRowView } from './viewModelAdapter';

describe('local view-model adapter', () => {
  it('isolates DTO field evolution with fallback mappings', () => {
    const row = toThreatRowView(
      {
        characterId: 99,
        name: 'Pilot Legacy',
        corporationName: 'Old Corp',
        allianceName: 'Old Alliance',
        shipTypeName: 'Tengu',
        threatScore: 73,
      },
      0,
    );

    expect(row).toMatchObject({
      id: '99',
      pilotName: 'Pilot Legacy',
      corp: 'Old Corp',
      alliance: 'Old Alliance',
      ship: 'Tengu',
      score: 73,
      level: 'high',
    });
  });

  it('maps pilot-linked warnings onto matching row detail data', () => {
    const view = toLocalScreenViewModel({
      sessionId: 's1',
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
        confidence: 1,
        removedDuplicates: 0,
        suspiciousArtifacts: 0,
        parsedAt: '2026-01-01T00:00:00Z',
      },
      pilots: [{
        identity: { characterId: 10, name: 'Alpha', corpId: 1, allianceId: 2 },
        threat: { threatScore: 60, threatBand: 'medium', threatReasons: [], confidence: 1 },
        lastUpdated: '2026-01-01T00:00:00Z',
        freshness: { source: 'zkill', dataAsOf: '2026-01-01T00:00:00Z', isStale: false },
      }],
      settings: { ignoredCorps: [], ignoredAlliances: [], pinnedPilots: [], refreshInterval: 30, scoring: { weights: { activity: 1, lethality: 1, soloRisk: 1, recentness: 1, context: 1, uncertainty: 1 }, thresholds: { low: 1, medium: 2, high: 3, critical: 4 } } },
      warnings: [{ provider: 'zkill', code: 'DETAIL_TIME_INVALID', message: 'Alpha bad timestamp', characterId: 10, characterName: 'Alpha', severity: 'info', userVisible: false, category: 'data-quality' }],
      freshness: { source: 'composite', dataAsOf: '2026-01-01T00:00:00Z', isStale: false },
    });

    expect(view.rows[0]?.warnings?.[0]?.message).toContain('Alpha bad timestamp');
    expect(view.diagnosticsSummary.severityCounts.info).toBe(0);
  });

  it('prioritizes enriched names and only falls back to id strings as partial metadata', () => {
    const enriched = toThreatRowView({
      identity: {
        characterId: 77,
        name: 'Gamma',
        corpId: 800,
        corpName: 'Gamma Corp',
        corpTicker: 'GC',
        allianceId: 900,
        allianceName: 'Gamma Alliance',
        allianceTicker: 'GA',
      },
      threat: { threatScore: 55 },
    }, 0);
    expect(enriched.corp).toBe('Gamma Corp');
    expect(enriched.corpTicker).toBe('GC');
    expect(enriched.orgMetadataPartial).toBe(false);

    const partial = toThreatRowView({
      identity: { characterId: 78, name: 'Delta', corpId: 801, allianceId: 0 },
      threat: { threatScore: 20 },
    }, 0);
    expect(partial.corp).toBe('Corp #801 (partial)');
    expect(partial.orgMetadataPartial).toBe(true);
  });
});
