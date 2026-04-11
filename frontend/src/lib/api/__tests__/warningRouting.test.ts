import { describe, expect, it } from 'vitest';
import { resolveWarningPresentation } from '../warningRouting';

describe('warning routing', () => {
  it('maps known warning codes to expected display tiers', () => {
    expect(resolveWarningPresentation('TRANSPORT_TIMEOUT', 'transport', false)).toMatchObject({
      displayTier: 'status_strip',
      normalizedLabel: 'Recent activity incomplete',
    });

    expect(resolveWarningPresentation('DETAIL_TIME_INVALID', 'data_quality', true)).toMatchObject({
      displayTier: 'detail_panel',
      normalizedLabel: 'Partial timestamps',
    });

    expect(resolveWarningPresentation('SUMMARY_ONLY', 'data_quality', true)).toMatchObject({
      displayTier: 'detail_panel',
      normalizedLabel: 'Derived from summary only',
    });
  });
});
