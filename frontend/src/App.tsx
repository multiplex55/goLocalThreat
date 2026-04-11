import { useMemo, useState } from 'react';
import './App.css';
import { HistoryFeature } from './features/history/HistoryFeature';
import { LocalScreen } from './features/local/LocalScreen';
import { initialAnalyzeState, mapAnalyzeError, reduceAnalyzeState } from './features/local/analyzeState';
import { SettingsFeature } from './features/settings/SettingsFeature';
import { hydrateWorkspacePrefs, dehydrateWorkspacePrefs } from './features/local/workspacePrefs';
import { analyzePastedText } from './lib/api';

type AppTab = 'local' | 'history' | 'settings';

function App() {
  const [tab, setTab] = useState<AppTab>('local');
  const workspacePrefs = useMemo(() => hydrateWorkspacePrefs(), []);
  const [pastedText, setPastedText] = useState(workspacePrefs.lastPastedInput);
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

  return (
    <div id="app-shell" className="shell-root" data-testid="app-shell">
      <header className="workspace-bar" data-testid="workspace-bar">
        <strong>goLocalThreat</strong>
        <nav className="workspace-tabs" aria-label="Primary tabs" data-testid="primary-tabs">
          <button type="button" aria-current={tab === 'local' ? 'page' : undefined} onClick={() => setTab('local')}>Local</button>
          <button type="button" aria-current={tab === 'history' ? 'page' : undefined} onClick={() => setTab('history')}>History</button>
          <button type="button" aria-current={tab === 'settings' ? 'page' : undefined} onClick={() => setTab('settings')}>Settings</button>
        </nav>
      </header>

      <main className="shell-main" data-testid="primary-content" aria-label="Primary content region">
        {tab === 'history' ? <HistoryFeature query={historyQuery} onQueryChange={setHistoryQuery} /> : null}
        {tab === 'settings' ? <SettingsFeature note={settingsNote} onNoteChange={setSettingsNote} /> : null}
        {tab === 'local' ? (
          <LocalScreen
            pastedText={pastedText}
            analyzeState={analyzeState}
            onPasteChange={(text) => {
              setPastedText(text);
              const current = hydrateWorkspacePrefs();
              dehydrateWorkspacePrefs({ ...current, lastPastedInput: text });
            }}
            onAnalyze={runAnalyze}
            useLocalIntelV2Layout
          />
        ) : null}
      </main>
    </div>
  );
}

export default App;
