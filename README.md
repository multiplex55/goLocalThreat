# goLocalThreat
Eve Online Local Threat in Go

## System Boundaries

`goLocalThreat` is organized around a strict boundary between application contracts, domain entities, and infrastructure adapters.

- **Bootstrap (`main.go`)**
  - Root `main.go` is the single startup entrypoint and source of truth for Wails composition.
  - Constructs `internal/app.AppService`, injects build metadata (`version`, `commit`, `date`), and wires startup/shutdown hooks.
  - `cmd/golocalthreat` has been retired to avoid duplicate startup paths.
- **Application layer (`internal/app`)**
  - Owns coarse API contracts exposed to Wails/UI (`AnalyzePastedText`, refresh actions, settings actions).
  - Coordinates domain objects and hides provider-specific DTOs.
- **Domain layer (`internal/domain`)**
  - Owns core business models and validation invariants (`AnalysisSession`, `PilotThreatRecord`, etc.).
  - Contains serialization-friendly types that travel across app and UI boundaries.
- **Parser layer (`internal/parser`)**
  - Owns transforming pasted local chat text into canonical identities/parse structures.
- **Provider layer (`internal/providers/esi`, `internal/providers/zkill`)**
  - Owns remote API access, retries, rate-limit handling, and provider DTO translation.
  - Never crosses directly into frontend contracts.
- **Scoring layer (`internal/scoring`)**
  - Owns threat scoring heuristics and composition of risk breakdown.
- **Persistence and support infrastructure (`internal/store`, `internal/cache`, `internal/logging`, `internal/telemetry`)**
  - Owns storage, caching, logging, and telemetry concerns behind interfaces used by the app layer.
- **Frontend API adapter (`frontend/src/lib/api`)**
  - Owns mapping generated Wails bindings into stable UI view models.
  - UI features/components should import this adapter only (never raw generated bindings).

## Frontend feature modules

- `frontend/src/features/settings`
  - Provides settings form state, validation, load/save actions, and settings defaults for score weights/thresholds, visible columns, density/theme, zKill TTL values, and ignored/pinned entities.
  - Uses only coarse Wails methods through the adapter (`LoadSettings`, `SaveSettings`).
- `frontend/src/features/history`
  - Provides history list state and helper actions to reopen previous sessions and inspect parse summaries.
  - Uses only coarse Wails method through the adapter (`LoadRecentSessions`).

## Build wrapper (`build.bat`)

`build.bat` is a thin wrapper around native tool commands (wrapper philosophy). It does not reimplement build logic; it delegates to `npm`, `go`, and `wails` while standardizing output paths to `dist/` and embedding metadata (`main.version`, `main.commit`, `main.date`) for build/release binaries.

### Commands

- `build.bat frontend-install`
  - Runs: `npm ci` in `frontend/`.
  - Expected output: npm dependency installation logs.
- `build.bat frontend-dev`
  - Runs: `npm run dev` in `frontend/`.
  - Expected output: frontend dev-server logs.
- `build.bat frontend-build`
  - Runs: `npm run build` in `frontend/`.
  - Expected output: frontend production build logs.
- `build.bat wails-generate`
  - Runs: `wails generate module` in repo root.
  - Expected output: generated Wails bindings under `frontend/wailsjs`.
- `build.bat dev`
  - Runs: `wails dev`.
  - Expected output: Wails development app logs.
- `build.bat test`
  - Runs: `go test ./...` then `npm test` in `frontend/`.
  - Expected output: Go test output followed by Vitest summary.
- `build.bat build`
  - Runs: `wails build -clean -o dist\goLocalThreat.exe` with version ldflags.
  - Expected output: packaged app binary in `dist/`.
- `build.bat release`
  - Runs: `wails build -clean -nsis -o dist\goLocalThreat.exe` with version ldflags.
  - Expected output: release-grade installer artifacts and binary in `dist/`.
- `build.bat clean`
  - Removes: `dist/` and generated frontend bindings at `frontend/wailsjs/`.
  - Expected output: cleanup log lines.


## Generated Wails bindings policy

- `frontend/wailsjs/` is generated output owned by Wails tooling (`wails generate module`).
- Do not hand-edit files under generated directories (`frontend/wailsjs/**`).
- If backend service signatures change, regenerate bindings and refresh sentinel metadata before committing.

### Canonical regeneration flow

1. `build.bat frontend-install`
2. `build.bat wails-generate`
3. `scripts/update-bindings-sentinel.sh`
4. `build.bat dev`

### Guardrails

- Repository policy check: `scripts/check-repo-policy.sh`
  - Fails if forbidden root artifacts (`./npm`, `./wails`) exist.
  - Fails if `frontend/wailsjs` bindings are missing/stale relative to `internal/app/AppService` exported methods.
  - Fails if generated binding hashes diverge from `frontend/wailsjs/.bindings-sentinel` (manual edits or stale output).
- Pre-commit hook: `.githooks/pre-commit` (enable with `git config core.hooksPath .githooks`).
  - Runs the repository policy check before commit.


## Frontend package manager policy

- Frontend uses **npm only** as the package manager.
- `frontend/package-lock.json` is required and must be kept in sync with `frontend/package.json`.
- `frontend/yarn.lock`, `frontend/pnpm-lock.yaml`, and `frontend/bun.lockb` are forbidden and will fail repository policy checks.

## Build and run

- **Source of truth:** root `main.go` is the only supported app bootstrap path.
- **Development:**
  - `build.bat dev` (recommended on Windows)
  - or `wails dev`
- **Tests:**
  - `build.bat test`
  - or `go test ./...` and `npm test` in `frontend/`
- **Production build:**
  - `build.bat build`
  - or `wails build -clean -o dist\\goLocalThreat.exe`
