# Validation Order, Shell-Green Milestone, and Feature Phases

This document defines the canonical validation order and milestone gates used for local development and CI.

## Canonical validation order

Run these steps in-order before promoting a branch:

1. `wails doctor`
2. `go version`
3. `npm --version`
4. `build.bat frontend-install`
5. `build.bat wails-generate`
6. `build.bat dev`
7. `build.bat test`
8. `build.bat build`

The CI pipeline mirrors these checks with explicit gate jobs (`bootstrap`, `generation`, `dev-compile`, `unit-tests`, `package-build`).

## Shell green milestone definition

A branch is **shell green** only when all criteria below are met:

- Wails app window opens successfully from `build.bat dev`.
- Paste/analyze roundtrip works end-to-end in the shell UI.
- At least one backend `AppService` call succeeds end-to-end through Wails bindings.

### Shell green acceptance criteria

- Dev shell starts without bootstrap errors.
- UI can accept pasted local content and return analysis output.
- At least one coarse API action (`AnalyzePastedText`, `LoadSettings`, or `LoadRecentSessions`) returns successfully through the frontend API adapter.

### Rollback-safe increment for shell green

- Keep shell-green changes isolated from feature-phase behavior.
- Do not combine shell-green bootstrap fixes with persistence schema changes in a single commit.

## Post-shell-green feature phases

After shell green, execute incremental phases in this order.

### Phase A: shell usability

Scope:

- Interaction ergonomics and usability in shell workflows.

Acceptance criteria:

- Core UI interactions (paste, selection, basic navigation) pass automated interaction tests.
- No regression in analyze-state transitions.

Rollback-safe increments:

- Ship small UI-focused commits that do not alter backend contracts.
- Guard with Phase A UI interaction suite.

CI regression suite:

- `npm run test -- frontend/src/features/local frontend/src/features/history`

### Phase B: real backend enrichment/stat paths

Scope:

- ESI/zKill provider enrichment and stat flow wiring through `internal/app`.

Acceptance criteria:

- Provider adapter/service tests pass with mocks/fakes.
- Enrichment flow returns deterministic domain-level results for fixture inputs.

Rollback-safe increments:

- Introduce provider or service behavior behind interfaces.
- Keep each provider contract change independently revertible.

CI regression suite:

- `go test ./internal/providers/... ./internal/app -count=1`

### Phase C: persistence (settings/sessions/pins, SQLite)

Scope:

- Repository/storage behavior for settings, sessions, pins, migrations, and TTL semantics.

Acceptance criteria:

- SQLite migration path is validated by tests.
- Repository semantics for settings/sessions/pins are deterministic.
- TTL behavior is covered by cache/store tests.

Rollback-safe increments:

- Apply schema migrations in forward-compatible, additive steps.
- Keep migration and repository behavior changes in separate commits when possible.

CI regression suite:

- `go test ./internal/store -count=1`

### Phase D: UX polish/search/sorting/indicators/errors/build metadata

Scope:

- UI sort/filter/search, status indicators, error messaging, and displayed build metadata.

Acceptance criteria:

- Sorting/filtering and indicator behavior are covered by tests.
- Error-state UX paths are validated.
- Build metadata is visible and consistent with embedded ldflags.

Rollback-safe increments:

- Isolate cosmetic/UX adjustments from data-model changes.
- Keep build-metadata display changes independent of packaging changes.

CI regression suite:

- `npm run test -- frontend/src/features/local/ThreatTable.test.tsx frontend/src/features/local/StatusBar.test.tsx frontend/src/features/history/__tests__/history_list.test.tsx`
