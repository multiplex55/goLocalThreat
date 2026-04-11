import { describe, expect, it } from 'vitest';
import { renderStatusBar } from '../StatusBar';

describe('StatusBarWarnings', () => {
  it('renders aggregate diagnostics count wording', () => {
    const text = renderStatusBar({
      provider: 'degraded',
      cache: 'warming',
      rate: 'limited',
      updatedAt: '2026-04-10T00:00:00Z',
      diagnostics: { partialKillmailTimestamps: 18 },
    });

    expect(text).toContain('Partial killmail timestamps: 18');
  });
});
