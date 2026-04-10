import { describe, expect, it } from 'vitest';
import { toThreatRowView } from './viewModelAdapter';

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
});
