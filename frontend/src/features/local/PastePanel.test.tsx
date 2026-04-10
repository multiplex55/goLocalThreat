import { describe, expect, it } from 'vitest';
import { renderParseSummary } from './PastePanel';

describe('PastePanel', () => {
  it('renders parse warnings and counts', () => {
    const output = renderParseSummary({
      candidateCount: 4,
      invalidLineCount: 2,
      duplicateRemovalCount: 1,
      warningCount: 2,
      warnings: [
        { code: 'chat_like_input_detected', message: 'chat-like input detected' },
        { code: 'duplicates_removed', message: 'duplicates removed' },
      ],
    });

    expect(output).toContain('Candidates: 4');
    expect(output).toContain('Invalid lines: 2');
    expect(output).toContain('Duplicates removed: 1');
    expect(output).toContain('Warnings: 2');
    expect(output).toContain('chat_like_input_detected');
    expect(output).toContain('duplicates_removed');
  });
});
