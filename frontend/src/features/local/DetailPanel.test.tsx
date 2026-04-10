import { describe, expect, it } from 'vitest';
import { buildDetailPanel } from './DetailPanel';

describe('DetailPanel', () => {
  it('renders score, confidence, and reason breakdown for selected pilot', () => {
    const view = buildDetailPanel({
      id: '1',
      pilotName: 'Alpha',
      corp: 'Acme Corp',
      corpTicker: 'ACME',
      alliance: 'Blue Alliance',
      allianceTicker: 'BLUE',
      mainShip: 'Drake',
      mainRecentShip: 'Drake',
      score: 80,
      threatBand: 'high',
      confidence: 0.84,
      reasonBreakdown: [{ label: 'Hunter', score: 20 }, { label: 'FC', score: 10 }],
      kills: 7,
      losses: 2,
      dangerPercent: 77,
      soloPercent: 50,
      avgGangSize: 3,
      soloGangTendency: 'Balanced',
      lastKill: '2026-04-08T00:00:00Z',
      lastLoss: '2026-04-07T00:00:00Z',
      lastActivitySummary: 'Last kill: 2026-04-08 · Last loss: 2026-04-07',
      freshness: 'Recently Active',
      tags: ['Hunter', 'FC'],
      notes: '',
      lastSeen: 'now',
      status: 'ready',
      orgMetadataPartial: false,
      dataCompletenessMarkers: [],
      warnings: [],
    });

    expect(view.sections).toContainEqual({ label: 'Threat', value: 'HIGH · 80' });
    expect(view.sections).toContainEqual({ label: 'Confidence', value: '84%' });
    expect(view.sections).toContainEqual({ label: 'Why this score', value: 'Hunter (+20), FC (+10)' });
  });

  it('shows explicit unknown marker when confidence is reduced', () => {
    const view = buildDetailPanel({
      id: '2',
      pilotName: 'Beta',
      corp: 'Corp #55 (partial)',
      alliance: 'None (partial)',
      mainShip: 'Unknown ship',
      mainRecentShip: 'Unknown ship',
      score: 5,
      threatBand: 'low',
      confidence: 0.45,
      reasonBreakdown: [],
      kills: 0,
      losses: 0,
      dangerPercent: 0,
      soloPercent: 0,
      avgGangSize: 0,
      soloGangTendency: 'Unknown',
      lastKill: 'Unknown',
      lastLoss: 'Unknown',
      lastActivitySummary: 'No recent activity',
      freshness: 'Stale Data',
      tags: [],
      notes: '',
      lastSeen: 'unknown',
      status: 'ready',
      orgMetadataPartial: true,
      dataCompletenessMarkers: ['Unknown due to partial killmail timestamps'],
      warnings: [],
    });

    expect(view.sections).toContainEqual({
      label: 'Data completeness',
      value: 'Unknown due to partial killmail timestamps',
    });
  });

  it('maps known semantic tags into badges', () => {
    const view = buildDetailPanel({
      id: '3',
      pilotName: 'Gamma',
      corp: 'Corp',
      alliance: 'Alliance',
      mainShip: 'Sabre',
      mainRecentShip: 'Sabre',
      score: 70,
      threatBand: 'high',
      confidence: 0.8,
      reasonBreakdown: [{ label: 'Gank', score: 15 }],
      kills: 0,
      losses: 0,
      dangerPercent: 50,
      soloPercent: 0,
      avgGangSize: 0,
      soloGangTendency: 'High Solo',
      lastKill: 'Unknown',
      lastLoss: 'Unknown',
      lastActivitySummary: 'Unknown',
      freshness: 'Recently Active',
      tags: ['Cyno', 'Pinned', 'Partial zKill'],
      notes: '',
      lastSeen: 'now',
      status: 'ready',
      dataCompletenessMarkers: [],
      warnings: [],
    });

    expect(view.semanticBadges.map((badge) => badge.label)).toEqual(expect.arrayContaining([
      'Cyno', 'Pinned', 'Partial zKill', 'High Solo', 'Recently Active',
    ]));
  });
});
