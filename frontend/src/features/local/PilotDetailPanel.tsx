import type { ThreatRowView } from './types';

interface PilotDetailPanelProps {
  row: ThreatRowView | null;
}

interface WarningGroup {
  category: string;
  labels: string[];
}

const WARNING_LABEL_BY_CODE: Record<string, string> = {
  DETAIL_TIME_INVALID: 'Partial timestamps',
  DETAIL_ACTIVITY_INCOMPLETE: 'Recent activity incomplete',
  SUMMARY_ONLY: 'Derived from summary only',
  DERIVED_SUMMARY_ONLY: 'Derived from summary only',
  DETAIL_TIME_MISSING: 'Recent activity incomplete',
  SUMMARY_FAILED: 'Summary unavailable',
  DETAIL_FAILED: 'Recent activity incomplete',
  RESOLVE_FAILED: 'Pilot lookup incomplete',
  UNRESOLVED_NAME: 'Pilot lookup incomplete',
  IDENTITY_PARTIAL: 'Pilot profile partial',
};

const WARNING_CATEGORY_LABELS: Record<string, string> = {
  data_quality: 'Data quality',
  provenance: 'Provenance',
  provider: 'Provider',
  other: 'Other',
};

function formatCorpAlliance(name: string, ticker?: string): string {
  if (!name) return '—';
  return ticker ? `${name} [${ticker}]` : name;
}

function normalizeWarningLabel(warning: NonNullable<ThreatRowView['warnings']>[number]): string {
  if (warning.normalizedLabel?.trim() && Object.values(WARNING_LABEL_BY_CODE).includes(warning.normalizedLabel)) return warning.normalizedLabel;
  const mapped = warning.code ? WARNING_LABEL_BY_CODE[warning.code] : undefined;
  if (mapped) return mapped;
  if (warning.rawCode && WARNING_LABEL_BY_CODE[warning.rawCode]) return WARNING_LABEL_BY_CODE[warning.rawCode];
  return 'Recent activity incomplete';
}

function deriveWarningCategory(warning: NonNullable<ThreatRowView['warnings']>[number]): string {
  if (warning.category && WARNING_CATEGORY_LABELS[warning.category]) return warning.category;
  if (warning.category?.trim()) return warning.category;
  if (warning.provider && warning.provider !== 'unknown') return 'provider';
  return 'other';
}

function groupWarnings(warnings: NonNullable<ThreatRowView['warnings']>): WarningGroup[] {
  const grouped = new Map<string, Set<string>>();
  warnings
    .filter((warning) => warning.displayTier === 'detail_panel')
    .forEach((warning) => {
      const category = deriveWarningCategory(warning);
      const label = normalizeWarningLabel(warning);
      const set = grouped.get(category) ?? new Set<string>();
      set.add(label);
      grouped.set(category, set);
    });

  return Array.from(grouped.entries())
    .map(([category, labels]) => ({
      category,
      labels: Array.from(labels).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => {
      const aLabel = WARNING_CATEGORY_LABELS[a.category] ?? a.category;
      const bLabel = WARNING_CATEGORY_LABELS[b.category] ?? b.category;
      return aLabel.localeCompare(bLabel);
    });
}

function deriveProvenanceState(row: ThreatRowView): 'summary-only' | 'detail-enriched' {
  if (row.detailFetched) return 'detail-enriched';
  const hasSummaryOnlyWarning = (row.warnings ?? []).some((warning) => normalizeWarningLabel(warning) === 'Derived from summary only' || normalizeWarningLabel(warning) === 'Data quality reduced');
  const isSummaryOnly = hasSummaryOnlyWarning || row.reasonBreakdown.length === 0 || row.provenance?.dangerPercent === 'unknown';
  return isSummaryOnly ? 'summary-only' : 'detail-enriched';
}

export function PilotDetailPanel({ row }: PilotDetailPanelProps) {
  if (!row) {
    return (
      <section className="pilot-detail-panel pilot-detail-empty" data-testid="pilot-detail-panel" aria-live="polite">
        <h3 data-testid="detail-title">No pilot selected</h3>
        <p data-testid="pilot-detail-empty-message">Select a row to inspect identity, summary, reasons, and warnings.</p>
      </section>
    );
  }

  const warningGroups = groupWarnings(row.warnings ?? []);
  const topReasons = row.reasonBreakdown.slice(0, 3);
  const provenanceState = deriveProvenanceState(row);

  return (
    <section className="pilot-detail-panel" data-testid="pilot-detail-panel" aria-live="polite">
      <div className="pilot-detail-sections" data-testid="detail-pane">
        <section data-testid="detail-section-identity">
          <h4>Identity</h4>
          <header className="pilot-detail-header">
            <div>
              <h3 data-testid="detail-title">{row.pilotName}</h3>
              <p className="pilot-detail-subtitle">{formatCorpAlliance(row.corp, row.corpTicker)} · {formatCorpAlliance(row.alliance, row.allianceTicker)}</p>
            </div>
            <div className="pilot-detail-threat-badge" data-band={row.threatBand} data-testid="pilot-detail-threat-badge">
              <span>{row.threatBand.toUpperCase()}</span>
              <strong>{row.score}</strong>
            </div>
          </header>
        </section>

        <section data-testid="detail-section-summary">
          <h4>Summary metrics</h4>
          <p>K/L {row.kills ?? '—'}/{row.losses ?? '—'} · danger {row.dangerPercent ?? '—'}% · solo {row.soloPercent ?? '—'}% · avg gang {row.avgGangSize ?? '—'}</p>
          <p>Last activity {row.lastActivitySummary || '—'} · main ship {row.mainRecentShip ?? '—'}</p>
          <p data-testid="detail-provenance-badge"><strong>Provenance:</strong> {provenanceState === 'summary-only' ? 'Summary-only' : 'Detail-enriched'}</p>
        </section>

        <section data-testid="detail-section-why">
          <h4>Why this score</h4>
          <ul data-testid="detail-reasons">
            {topReasons.length
              ? topReasons.map((entry) => <li key={`${entry.label}-${entry.score}`}>{entry.label} (+{entry.score})</li>)
              : <li>No reasons yet.</li>}
          </ul>
        </section>

        <section data-testid="detail-section-warnings">
          <h4>Warnings & data quality</h4>
          <p><strong>Notes:</strong> {row.notes || '—'}</p>
          <ul data-testid="detail-warnings">
            {warningGroups.length
              ? warningGroups.map((group) => (
                <li key={group.category}>
                  <strong>{WARNING_CATEGORY_LABELS[group.category] ?? group.category}:</strong> {group.labels.join(', ')}
                </li>
              ))
              : <li>None.</li>}
          </ul>
        </section>
      </div>
    </section>
  );
}
