export interface ParseWarningsView {
  warningLines: string[];
  unresolvedCount: number;
}

export function buildParseWarnings(warnings: string[], resolvedCodes: string[] = []): ParseWarningsView {
  const unresolvedCount = warnings.filter((w) => !resolvedCodes.some((r) => w.includes(r))).length;
  return {
    warningLines: warnings,
    unresolvedCount,
  };
}
