import { describe, expect, it } from 'vitest';
import { toThreatRowView } from './viewModelAdapter';

describe('local view-model adapter', () => {
  it('computes and formats percentage/date/fallback row values', () => {
    const row = toThreatRowView({
      characterId: 99,
      name: 'Pilot Legacy',
      corporationName: 'Old Corp',
      allianceName: 'Old Alliance',
      threatScore: 73,
      dangerPercent: 66.6,
      soloPercent: 21.2,
      avgGangSize: 3.4,
      lastKill: '2026-04-10T12:34:56Z',
      notes: 'Watched gatecamp',
    }, 0);

    expect(row.id).toBe('99');
    expect(row.pilotName).toBe('Pilot Legacy');
    expect(row.threatBand).toBe('high');
    expect(row.dangerPercent).toBeCloseTo(66.6);
    expect(row.soloPercent).toBeCloseTo(21.2);
    expect(row.lastKill).toBe('2026-04-10T12:34:56Z');
    expect(row.lastLoss).toBe('Unknown');
    expect(row.mainShip).toBe('Unknown ship');
    expect(row.notes).toContain('Watched');
  });

  it('uses identity fallbacks when org metadata is missing', () => {
    const partial = toThreatRowView({
      identity: { characterId: 78, name: 'Delta', corpId: 801, allianceId: 0 },
      threat: { threatScore: 20 },
    }, 0);
    expect(partial.corp).toBe('Corp #801 (partial)');
    expect(partial.orgMetadataPartial).toBe(true);
  });
});
