import type { ThreatRowView } from './types';

interface PilotDetailPanelProps {
  row: ThreatRowView | null;
}

function formatCorpAlliance(name: string, ticker?: string): string {
  if (!name) return '—';
  return ticker ? `${name} [${ticker}]` : name;
}

function formatActivity(lastKill: string | null, lastLoss: string | null): string {
  return `Last kill: ${lastKill ?? '—'} · Last loss: ${lastLoss ?? '—'}`;
}

function getExplanationQuality(row: ThreatRowView): 'High' | 'Medium' | 'Low' {
  if (row.reasonBreakdown.length >= 3 && row.confidence >= 0.75) return 'High';
  if (row.reasonBreakdown.length >= 2 && row.confidence >= 0.55) return 'Medium';
  return 'Low';
}

export function PilotDetailPanel({ row }: PilotDetailPanelProps) {
  if (!row) {
    return (
      <section className="pilot-detail-panel pilot-detail-empty" data-testid="pilot-detail-panel" aria-live="polite">
        <h3 data-testid="detail-title">No pilot selected</h3>
        <p data-testid="pilot-detail-empty-message">Select a row to inspect identity, threat evidence, and pilot-specific warnings.</p>
      </section>
    );
  }

  const warningRows = row.warnings ?? [];
  const explanationQuality = getExplanationQuality(row);
  const qualityMarkers = row.dataCompletenessMarkers ?? [];
  const hasPartialTimestampMarker = qualityMarkers.includes('Partial timestamps');
  const displayedWarnings = warningRows.filter((warning) => !(hasPartialTimestampMarker && /timestamp/i.test(warning.message)));

  return (
    <section className="pilot-detail-panel" data-testid="pilot-detail-panel" aria-live="polite">
      <header className="pilot-detail-header">
        <div>
          <h3 data-testid="detail-title">{row.pilotName}</h3>
          <p className="pilot-detail-subtitle">Pilot detail</p>
        </div>
        <div className="pilot-detail-threat-badge" data-band={row.threatBand} data-testid="pilot-detail-threat-badge">
          <span className="pilot-detail-threat-band">{row.threatBand.toUpperCase()}</span>
          <strong>{row.score}</strong>
        </div>
      </header>

      <div className="pilot-detail-sections" data-testid="detail-pane">
        <section>
          <h4>Identity</h4>
          <p><strong>Name:</strong> {row.pilotName}</p>
          <p><strong>Corporation:</strong> {formatCorpAlliance(row.corp, row.corpTicker)}</p>
          <p><strong>Alliance:</strong> {formatCorpAlliance(row.alliance, row.allianceTicker)}</p>
        </section>

        <section>
          <h4>Threat summary</h4>
          <p><strong>Band:</strong> {row.threatBand.toUpperCase()}</p>
          <p><strong>Score:</strong> {row.score}</p>
          <p><strong>Confidence:</strong> {Math.round(row.confidence * 100)}%</p>
        </section>

        <section>
          <h4>Combat stats</h4>
          <p><strong>Kills/Losses:</strong> {row.kills ?? '—'}/{row.losses ?? '—'}</p>
          <p><strong>Danger %:</strong> {row.dangerPercent === null ? '—' : `${row.dangerPercent}%`}</p>
          <p><strong>Solo %:</strong> {row.soloPercent === null ? '—' : `${row.soloPercent}%`}</p>
          <p><strong>Avg gang:</strong> {row.avgGangSize ?? '—'}</p>
          <p><strong>Recent ship:</strong> {row.mainRecentShip ?? '—'}</p>
        </section>

        <section>
          <h4>Activity timing</h4>
          <p>{formatActivity(row.lastKill, row.lastLoss)}</p>
          <p><strong>Freshness:</strong> {row.freshness ?? '—'}</p>
        </section>

        <section>
          <h4>Why this score</h4>
          <p className="pilot-detail-explanation-quality"><strong>Explanation quality:</strong> {explanationQuality}</p>
          <p>
            Threat score combines combat activity, ship/risk profile, recency, and confidence signals from the latest provider responses.
          </p>
          <ul data-testid="detail-reasons">
            {row.reasonBreakdown.length ? row.reasonBreakdown.map((entry) => (
              <li key={`${entry.label}-${entry.score}`}>{entry.label} (+{entry.score})</li>
            )) : <li>No reasons yet.</li>}
          </ul>
        </section>

        <section>
          <h4>Data quality</h4>
          <ul data-testid="detail-data-quality">
            {hasPartialTimestampMarker ? <li>Partial killmail timestamps detected; timing-based metrics may be understated.</li> : null}
            {qualityMarkers.filter((marker) => marker !== 'Partial timestamps').map((marker) => (
              <li key={marker}>{marker}</li>
            ))}
            {!qualityMarkers.length ? <li>No data quality warnings.</li> : null}
            {!row.reasonBreakdown.length ? <li>Score likely derived from summary-level signals due to limited detail evidence.</li> : null}
          </ul>
        </section>

        <section>
          <h4>Notes and pilot-specific warnings</h4>
          <p><strong>Notes:</strong> {row.notes || '—'}</p>
          <ul data-testid="detail-warnings">
            {displayedWarnings.length ? displayedWarnings.map((warning, index) => (
              <li key={`${warning.message}-${index}`} style={{ opacity: warning.severity === 'info' || warning.userVisible === false ? 0.7 : 1 }}>
                {warning.message}
              </li>
            )) : <li>None.</li>}
          </ul>
        </section>
      </div>
    </section>
  );
}
