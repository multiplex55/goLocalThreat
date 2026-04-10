import type { ParseSummaryView } from '../../types/analysis';

export function renderParseSummary(summary: ParseSummaryView): string {
  const warningLines = summary.warnings.length
    ? summary.warnings.map((w) => `- ${w.code}: ${w.message}`).join('\n')
    : '- none';

  return [
    `Candidates: ${summary.candidateCount}`,
    `Invalid lines: ${summary.invalidLineCount}`,
    `Duplicates removed: ${summary.duplicateRemovalCount}`,
    `Warnings: ${summary.warningCount}`,
    warningLines,
  ].join('\n');
}
