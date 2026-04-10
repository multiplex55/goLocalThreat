# Frontend ↔ AppService Contract

After bootstrap/scaffold setup, run wrapper flow in this order:

1. `build.bat frontend-install`
2. `build.bat wails-generate`
3. `build.bat dev`

Generated Wails bindings are expected at `frontend/wailsjs/go/app/AppService.ts`.

## Method usage map

| Go method (`internal/app/AppService`) | Frontend usage point | Notes |
| --- | --- | --- |
| `AnalyzePastedText(text)` | `frontend/src/lib/api/adapter.ts` (`analyzePastedText`) | Main local-analysis entrypoint, then adapted to UI view model. |
| `LoadRecentSessions(limit)` | `frontend/src/lib/api/adapter.ts` (`loadRecentSessions`) + `frontend/src/features/history/historyList.ts` | History feature calls this then maps via `toAnalysisSessionView`. |
| `LoadSettings()` | `frontend/src/lib/api/adapter.ts` (`loadSettings`) + `frontend/src/features/settings/settingsForm.ts` | Settings screen initialization. |
| `SaveSettings(settings)` | `frontend/src/lib/api/adapter.ts` (`saveSettings`) + `frontend/src/features/settings/settingsForm.ts` | Settings persistence path. |
| `GetBuildInfo()` | Binding exists for shell/runtime metadata use. | Currently not consumed in app UI. |
| `RefreshSession(sessionID)` | Binding exists for refresh workflows. | Currently not wired in UI. |
| `RefreshPilot(sessionID, characterID)` | Binding exists for refresh workflows. | Currently not wired in UI. |
| `PinPilot(characterID)` | Binding exists for settings/workflow expansion. | Currently not wired in UI. |
| `IgnoreCorp(corpID)` | Binding exists for settings/workflow expansion. | Currently not wired in UI. |
| `IgnoreAlliance(allianceID)` | Binding exists for settings/workflow expansion. | Currently not wired in UI. |
| `ClearCache()` | Binding exists for maintenance workflows. | Currently not wired in UI. |

## Guardrails

- `scripts/check-bindings-freshness.sh` fails fast if exported AppService methods and generated binding exports drift.
- `frontend/src/contract/generated-bindings.contract.ts` is a compile-time contract test that imports generated bindings and asserts critical symbols/signatures.
- `internal/app/frontend_contract_test.go` validates JSON response shapes consumed by frontend adapter and settings flows.
