import { describe, expect, it } from 'vitest';
import { buildThreatTableRow } from '../ThreatTableRow';
import type { ThreatRowView } from '../types';

const baseRow: ThreatRowView = {
  id: 'pilot-meta',
  pilotName: 'Metadata Pilot',
  corp: 'Known Corp',
  alliance: 'Known Alliance',
  mainShip: 'Vexor',
  mainRecentShip: 'Vexor',
  score: 55,
  threatBand: 'medium',
  confidence: 0.6,
  reasonBreakdown: [],
  kills: 2,
  losses: 3,
  dangerPercent: 37,
  soloPercent: 45,
  avgGangSize: 3,
  soloGangTendency: 'Balanced',
  lastKill: null,
  lastLoss: null,
  lastActivitySummary: '—',
  freshness: null,
  tags: [],
  notes: '',
  lastSeen: null,
  status: 'ready',
  dataCompletenessMarkers: [],
};

describe('metadata muting hook', () => {
  it('uses muted metadata class when corp/alliance is unknown', () => {
    const complete = buildThreatTableRow(baseRow, false, false);
    const unknownCorp = buildThreatTableRow({ ...baseRow, id: 'unknown-corp', corp: '' }, false, false);

    expect(complete.identity.metadataClassName).toBe('');
    expect(unknownCorp.identity.metadataClassName).toBe('threat-cell-meta-muted');
  });
});
