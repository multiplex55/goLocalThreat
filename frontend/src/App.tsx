import { useState } from 'react';
import './App.css';
import { HistoryFeature } from './features/history/HistoryFeature';
import { LocalScreen } from './features/local/LocalScreen';
import { initialAnalyzeState, mapAnalyzeError, reduceAnalyzeState } from './features/local/analyzeState';
import { SettingsFeature } from './features/settings/SettingsFeature';
import { analyzePastedText } from './lib/api';

type AppTab = 'local' | 'history' | 'settings';

function App() {
  const [tab, setTab] = useState<AppTab>('local');
  const [pastedText, setPastedText] = useState('');
  const [analyzeState, setAnalyzeState] = useState(initialAnalyzeState);
  const [historyQuery, setHistoryQuery] = useState('');
  const [settingsNote, setSettingsNote] = useState('');

  const runAnalyze = async () => {
    if (!pastedText.trim()) {
      const mapped = mapAnalyzeError(new Error('empty paste'));
      setAnalyzeState((prev) => reduceAnalyzeState(prev, { type: 'ERROR', ...mapped }));
      return;
    }

    setAnalyzeState((prev) => reduceAnalyzeState(prev, { type: 'START' }));
    try {
      const result = await analyzePastedText(pastedText);
      setAnalyzeState((prev) => reduceAnalyzeState(prev, { type: 'SUCCESS', payload: result }));
    } catch (error) {
      const mapped = mapAnalyzeError(error);
      setAnalyzeState((prev) => reduceAnalyzeState(prev, { type: 'ERROR', ...mapped }));
    }
  };
  const screen = (() => {
    if (tab === 'history') {
      return <HistoryFeature query={historyQuery} onQueryChange={setHistoryQuery} />;
    }
    if (tab === 'settings') {
      return <SettingsFeature note={settingsNote} onNoteChange={setSettingsNote} />;
    }

    return (
      <LocalScreen
        pastedText={pastedText}
        analyzeState={analyzeState}
        onPasteChange={setPastedText}
        onAnalyze={runAnalyze}
        useLocalIntelV2Layout
      />
    );
  })();

  return (
    <div id="app-shell" className="shell-root" data-testid="app-shell">
      <header className="shell-header" data-testid="primary-header">
        <h1>goLocalThreat</h1>
        <p>Local intel overview and analysis workspace.</p>
      </header>

      <nav className="shell-tabs" aria-label="Primary tabs" data-testid="primary-tabs">
        <button type="button" aria-current={tab === 'local' ? 'page' : undefined} onClick={() => setTab('local')}>Local</button>
        <button type="button" aria-current={tab === 'history' ? 'page' : undefined} onClick={() => setTab('history')}>History</button>
        <button type="button" aria-current={tab === 'settings' ? 'page' : undefined} onClick={() => setTab('settings')}>Settings</button>
      </nav>

      <main className="shell-main" data-testid="primary-content" aria-label="Primary content region">
        {screen}
      </main>
    </div>
  );
}

export default App;
