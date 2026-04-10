import { describe, expect, it } from 'vitest';
import { renderStatusBar } from './StatusBar';

describe('StatusBar', () => {
  it('renders provider, cache and rate status', () => {
    const text = renderStatusBar({
      provider: 'degraded',
      cache: 'warming',
      rate: 'limited',
      updatedAt: '2026-04-10T00:00:00Z',
    });

    expect(text).toContain('Provider:degraded');
    expect(text).toContain('Cache:warming');
    expect(text).toContain('Rate:limited');
  });
});
