import './App.css';

function App() {
  return (
    <div id="app-shell" className="shell-root" data-testid="app-shell">
      <header className="shell-header" data-testid="primary-header">
        <h1>goLocalThreat</h1>
        <p>Local intel overview and analysis workspace.</p>
      </header>

      <nav className="shell-tabs" aria-label="Primary tabs" data-testid="primary-tabs">
        <button type="button" aria-current="page">Local</button>
        <button type="button">History</button>
        <button type="button">Settings</button>
      </nav>

      <main className="shell-main" data-testid="primary-content" aria-label="Primary content region">
        <section className="shell-panel" data-testid="analysis-region">
          <h2>Analysis</h2>
          <p>Feature modules remain mounted under this shell composition layer.</p>
        </section>
        <aside className="shell-side" data-testid="side-region">
          <h2>Session</h2>
          <p>Summary, parse status, and selected pilot details appear here.</p>
        </aside>
      </main>
    </div>
  );
}

export default App;
