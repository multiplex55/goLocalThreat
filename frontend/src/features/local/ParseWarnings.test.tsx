import { describe, expect, it } from 'vitest';
import { buildParseWarnings } from './ParseWarnings';

describe('ParseWarnings', () => {
  it('renders warning list and unresolved count', () => {
    const warnings = ['duplicates_removed: 2 duplicates removed', 'chat_like_input_detected: check source'];
    const view = buildParseWarnings(warnings, ['duplicates_removed']);

    expect(view.warningLines).toEqual(warnings);
    expect(view.unresolvedCount).toBe(1);
  });
});
