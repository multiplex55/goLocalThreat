import type { ParseWarningView } from '../../types/analysis';

export interface WarningPresentation {
  normalizedLabel: string;
  displayTier: NonNullable<ParseWarningView['displayTier']>;
}

const WARNING_PRESENTATION_BY_CODE: Record<string, WarningPresentation> = {
  DETAIL_TIME_INVALID: { normalizedLabel: 'Partial timestamps', displayTier: 'detail_panel' },
  DETAIL_TIME_MISSING: { normalizedLabel: 'Recent activity incomplete', displayTier: 'detail_panel' },
  SUMMARY_FAILED: { normalizedLabel: 'Summary unavailable', displayTier: 'status_strip' },
  DETAIL_FAILED: { normalizedLabel: 'Recent activity incomplete', displayTier: 'status_strip' },
  RESOLVE_FAILED: { normalizedLabel: 'Pilot lookup incomplete', displayTier: 'status_strip' },
  IDENTITY_PARTIAL: { normalizedLabel: 'Pilot profile partial', displayTier: 'status_strip' },
  UNRESOLVED_NAME: { normalizedLabel: 'Pilot lookup incomplete', displayTier: 'status_strip' },
  SUMMARY_ONLY: { normalizedLabel: 'Derived from summary only', displayTier: 'detail_panel' },
  TRANSPORT_TIMEOUT: { normalizedLabel: 'Recent activity incomplete', displayTier: 'status_strip' },
  TRANSPORT_RATE_LIMIT: { normalizedLabel: 'Recent activity incomplete', displayTier: 'status_strip' },
  RATE_LIMITED: { normalizedLabel: 'Recent activity incomplete', displayTier: 'status_strip' },
};

function isTransportCategory(category: string | undefined): boolean {
  return category === 'transport' || category === 'network';
}

export function resolveWarningPresentation(code: string, category: string | undefined, scopedToPilot: boolean): WarningPresentation {
  const known = WARNING_PRESENTATION_BY_CODE[code];
  if (known) return known;

  if (isTransportCategory(category) && !scopedToPilot) {
    return { normalizedLabel: 'Recent activity incomplete', displayTier: 'status_strip' };
  }

  if (scopedToPilot) {
    return { normalizedLabel: 'Recent activity incomplete', displayTier: 'row_hint' };
  }

  return { normalizedLabel: 'Recent activity incomplete', displayTier: 'status_strip' };
}

export function dedupeWarnings(warnings: ParseWarningView[]): ParseWarningView[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = [warning.severity, warning.category, warning.normalizedLabel ?? warning.message].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function groupWarningsBySeverityAndCategory(warnings: ParseWarningView[]): Record<string, ParseWarningView[]> {
  return warnings.reduce<Record<string, ParseWarningView[]>>((acc, warning) => {
    const key = `${warning.severity}:${warning.category}`;
    acc[key] = acc[key] ?? [];
    acc[key].push(warning);
    return acc;
  }, {});
}
