interface HistoryFeatureProps {
  query: string;
  onQueryChange: (value: string) => void;
}

export function HistoryFeature({ query, onQueryChange }: HistoryFeatureProps) {
  return (
    <section data-testid="history-feature">
      <h2>History</h2>
      <label htmlFor="history-query">Search sessions</label>
      <input
        id="history-query"
        data-testid="history-query"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
    </section>
  );
}
