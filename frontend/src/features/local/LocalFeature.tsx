import type { AnalyzeState } from './analyzeState';

interface LocalFeatureProps {
  pastedText: string;
  selectedPilotId: string | null;
  analyzeState: AnalyzeState;
  onPasteChange: (text: string) => void;
  onAnalyze: () => void;
  onRetry: () => void;
  onSelectPilot: (pilotId: string) => void;
}

export function LocalFeature({
  pastedText,
  selectedPilotId,
  analyzeState,
  onPasteChange,
  onAnalyze,
  onRetry,
  onSelectPilot,
}: LocalFeatureProps) {
  const pilots = analyzeState.data?.pilots ?? [];
  const selectedPilot = pilots.find((pilot) => pilot.id === selectedPilotId) ?? pilots[0] ?? null;

  return (
    <div data-testid="local-feature">
      <label htmlFor="paste-input">Pasted roster</label>
      <textarea
        id="paste-input"
        data-testid="paste-textbox"
        value={pastedText}
        onChange={(event) => onPasteChange(event.target.value)}
        rows={6}
      />

      <div>
        <button type="button" onClick={onAnalyze} disabled={analyzeState.status === 'loading'}>
          {analyzeState.status === 'loading' ? 'Analyzing…' : 'Analyze'}
        </button>
        {analyzeState.status === 'error' && (
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>

      {analyzeState.status === 'error' && (
        <p role="alert" data-testid="analyze-error">
          {analyzeState.message}
        </p>
      )}

      <section>
        <h3>Threat table</h3>
        {analyzeState.status === 'success' && pilots.length === 0 && <p data-testid="empty-state">No threats found.</p>}
        <ul data-testid="threat-table">
          {pilots.map((pilot) => (
            <li key={pilot.id}>
              <button type="button" onClick={() => onSelectPilot(pilot.id)}>
                {pilot.name} · {pilot.score} · {pilot.band}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <aside data-testid="detail-pane">
        <h3>Detail</h3>
        {selectedPilot ? (
          <div>
            <p>{selectedPilot.name}</p>
            <p>{selectedPilot.corporation}</p>
            <p>{selectedPilot.alliance}</p>
            <p>{selectedPilot.reasons.join(', ') || 'No reasons provided'}</p>
          </div>
        ) : (
          <p>No pilot selected.</p>
        )}
      </aside>

      <footer data-testid="status-bar">
        Status: {analyzeState.status}
        {analyzeState.data ? ` · ${analyzeState.data.pilotCount} pilots` : ''}
      </footer>
    </div>
  );
}
