import { describe, expect, it } from 'vitest';
import { nextSelectionIndex } from './LocalScreen';

describe('LocalScreen selection helpers', () => {
  it('moves down and up within bounds', () => {
    expect(nextSelectionIndex(0, 2, 'ArrowDown')).toBe(1);
    expect(nextSelectionIndex(1, 2, 'ArrowDown')).toBe(1);
    expect(nextSelectionIndex(1, 2, 'ArrowUp')).toBe(0);
  });
});
