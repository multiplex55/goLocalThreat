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
  const diagnostics = analyzeState.data?.diagnostics;
  const selectedPilot = pilots.find((pilot) => pilot.id === selectedPilotId) ?? pilots[0] ?? null;
  const unresolvedNames = diagnostics?.unresolvedNames ?? [];
  const unresolvedOverflowThreshold = 5;
  const hasLongUnresolvedList = unresolvedNames.length > unresolvedOverflowThreshold;
  const emptyUnresolvedState = analyzeState.status === 'success' && (diagnostics?.candidateNamesCount ?? 0) > 0 && pilots.length === 0;
  const showNoThreatsFound = analyzeState.status === 'success' && pilots.length === 0 && !emptyUnresolvedState;

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

      {analyzeState.status === 'success' && diagnostics && (
        <section data-testid="diagnostics">
          <h3>Diagnostics</h3>
          <p>
            Parsed {diagnostics.candidateNamesCount} candidate names · resolved {diagnostics.resolvedCount}
          </p>
          {diagnostics.invalidLines > 0 && (
            <p data-testid="invalid-lines-summary">Invalid lines detected: {diagnostics.invalidLines}</p>
          )}
          {diagnostics.warnings.length > 0 && (
            <div data-testid="provider-warnings">
              <p>Provider warnings:</p>
              <ul>
                {diagnostics.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          {unresolvedNames.length > 0 && (
            <div data-testid="unresolved-names">
              {hasLongUnresolvedList ? (
                <details>
                  <summary>Unresolved names: {unresolvedNames.length}</summary>
                  <ul>
                    {unresolvedNames.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </details>
              ) : (
                <>
                  <p>Unresolved names: {unresolvedNames.length}</p>
                  <ul>
                    {unresolvedNames.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </section>
      )}

      <section>
        <h3>Threat table</h3>
        {emptyUnresolvedState && (
          <p data-testid="unresolved-empty-state">
            Parsed {diagnostics?.candidateNamesCount ?? 0} names, but none could be resolved through ESI.
          </p>
        )}
        {showNoThreatsFound && <p data-testid="empty-state">No threats found.</p>}
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
