import type { ThreatRowView } from './types';

interface PilotDetailPanelProps {
  row: ThreatRowView | null;
}

function formatCorpAlliance(name: string, ticker?: string): string {
  if (!name) return '—';
  return ticker ? `${name} [${ticker}]` : name;
}

function dedupeAndGroupDetailWarnings(warnings: NonNullable<ThreatRowView['warnings']>): Array<{ group: string; labels: string[] }> {
  const grouped = new Map<string, Set<string>>();
  warnings.filter((warning) => warning.displayTier === 'detail_panel').forEach((warning) => {
    const group = `${warning.severity ?? 'info'}:${warning.category ?? 'provider'}`;
    const label = warning.normalizedLabel ?? warning.message;
    const bucket = grouped.get(group) ?? new Set<string>();
    bucket.add(label);
    grouped.set(group, bucket);
  });
  return Array.from(grouped.entries()).map(([group, labels]) => ({ group, labels: Array.from(labels) }));
}

export function PilotDetailPanel({ row }: PilotDetailPanelProps) {
  if (!row) {
    return (
      <section className="pilot-detail-panel pilot-detail-empty" data-testid="pilot-detail-panel" aria-live="polite">
        <h3 data-testid="detail-title">No pilot selected</h3>
        <p data-testid="pilot-detail-empty-message">Select a row to inspect identity, evidence, and warnings.</p>
      </section>
    );
  }

  const groupedWarnings = dedupeAndGroupDetailWarnings(row.warnings ?? []);

  return (
    <section className="pilot-detail-panel" data-testid="pilot-detail-panel" aria-live="polite">
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

      <div className="pilot-detail-sections" data-testid="detail-pane">
        <section>
          <h4>Scan summary</h4>
          <p>K/L {row.kills ?? '—'}/{row.losses ?? '—'} · danger {row.dangerPercent ?? '—'}% · solo {row.soloPercent ?? '—'}% · avg gang {row.avgGangSize ?? '—'}</p>
          <p>Last kill {row.lastKill ?? '—'} · last loss {row.lastLoss ?? '—'} · ship {row.mainRecentShip ?? '—'}</p>
        </section>

        <section>
          <h4>Why this score</h4>
          <ul data-testid="detail-reasons">
            {row.reasonBreakdown.length ? row.reasonBreakdown.map((entry) => <li key={`${entry.label}-${entry.score}`}>{entry.label} (+{entry.score})</li>) : <li>No reasons yet.</li>}
          </ul>
          <p className="pilot-detail-explanation-quality">Warnings and long-form explanation are intentionally moved here to keep table scanning compact.</p>
        </section>

        <section>
          <h4>Warnings & notes</h4>
          <p><strong>Notes:</strong> {row.notes || '—'}</p>
          <ul data-testid="detail-warnings">
            {groupedWarnings.length ? groupedWarnings.map((group) => <li key={group.group}>{group.group} · {group.labels.join(', ')}</li>) : <li>None.</li>}
          </ul>
        </section>
      </div>
    </section>
  );
}
