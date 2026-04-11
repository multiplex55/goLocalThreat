import type { ThreatRowView } from './types';

interface PilotDetailPanelProps {
  row: ThreatRowView | null;
}

function formatCorpAlliance(name: string, ticker?: string): string {
  if (!name) return '—';
  return ticker ? `${name} [${ticker}]` : name;
}

function dedupeAndGroupDetailWarnings(warnings: NonNullable<ThreatRowView['warnings']>): Array<{ label: string; count: number }> {
  const grouped = new Map<string, number>();
  warnings
    .filter((warning) => warning.displayTier === 'detail_panel')
    .forEach((warning) => {
      const label = warning.normalizedLabel ?? warning.message;
      grouped.set(label, (grouped.get(label) ?? 0) + 1);
    });
  return Array.from(grouped.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label));
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
            {groupedWarnings.length
              ? groupedWarnings.map((group) => <li key={group.label}>{group.label}{group.count > 1 ? ` (${group.count})` : ''}</li>)
              : <li>None.</li>}
          </ul>
        </section>
      </div>
    </section>
  );
}
