import { describe, expect, it } from 'vitest';
import { buildThreatTableRow } from '../ThreatTableRow';
import type { ThreatRowView } from '../types';

const baseRow: ThreatRowView = {
  id: 'pilot-band',
  pilotName: 'Band Pilot',
  corp: 'Corp',
  alliance: 'Alliance',
  mainShip: 'Drake',
  mainRecentShip: 'Drake',
  score: 40,
  threatBand: 'low',
  confidence: 0.9,
  reasonBreakdown: [],
  kills: 1,
  losses: 1,
  dangerPercent: 12,
  soloPercent: 20,
  avgGangSize: 2,
  soloGangTendency: 'Balanced',
  lastKill: null,
  lastLoss: null,
  lastActivitySummary: '—',
  freshness: 'fresh',
  tags: [],
  notes: '',
  lastSeen: null,
  status: 'ready',
  dataCompletenessMarkers: [],
};

describe('threat band classnames', () => {
  it('maps LOW/MED/HIGH labels to threat-band style hooks', () => {
    const low = buildThreatTableRow({ ...baseRow, threatBand: 'low', score: 10 }, false, true);
    const med = buildThreatTableRow({ ...baseRow, id: 'med', threatBand: 'medium', score: 50 }, false, true);
    const high = buildThreatTableRow({ ...baseRow, id: 'high', threatBand: 'high', score: 90 }, false, true);

    expect(low.score.badgeText.startsWith('LOW')).toBe(true);
    expect(med.score.badgeText.startsWith('MED')).toBe(true);
    expect(high.score.badgeText.startsWith('HIGH')).toBe(true);

    expect(low.threatBandClassName).toBe('threat-band--low');
    expect(med.threatBandClassName).toBe('threat-band--medium');
    expect(high.threatBandClassName).toBe('threat-band--high');
  });
});
