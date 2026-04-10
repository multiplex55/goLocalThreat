import { describe, expect, it } from 'vitest';
import { buildDetailPanel } from './DetailPanel';

describe('DetailPanel', () => {
  it('renders enriched org display names and tickers', () => {
    const view = buildDetailPanel({
      id: '1',
      pilotName: 'Alpha',
      corp: 'Acme Corp',
      corpTicker: 'ACME',
      alliance: 'Blue Alliance',
      allianceTicker: 'BLUE',
      ship: 'Drake',
      score: 80,
      level: 'high',
      tags: [],
      lastSeen: 'now',
      status: 'ready',
      orgMetadataPartial: false,
    });

    expect(view.sections).toContainEqual({ label: 'Corporation', value: 'Acme Corp [ACME]' });
    expect(view.sections).toContainEqual({ label: 'Alliance', value: 'Blue Alliance [BLUE]' });
    expect(view.sections).toContainEqual({ label: 'Org Metadata', value: 'Fresh' });
  });

  it('uses partial marker when fallback formatting is in use', () => {
    const view = buildDetailPanel({
      id: '2',
      pilotName: 'Beta',
      corp: 'Corp #55 (partial)',
      alliance: 'None (partial)',
      ship: 'Unknown ship',
      score: 5,
      level: 'low',
      tags: [],
      lastSeen: 'unknown',
      status: 'ready',
      orgMetadataPartial: true,
    });

    expect(view.sections).toContainEqual({ label: 'Org Metadata', value: 'Partial (ID fallback)' });
  });
});
