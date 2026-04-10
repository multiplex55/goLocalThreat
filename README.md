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
  - Runs: `wails build -clean -nopackage -o goLocalThreat.exe` with version ldflags, then copies `build/bin/goLocalThreat.exe` to `dist/`.
  - Expected output: packaged app binary in `dist/`.
- `build.bat release`
  - Runs: `wails build -clean -nsis -o goLocalThreat.exe` with version ldflags, then copies `build/bin/goLocalThreat.exe` to `dist/` when produced.
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


## Validation milestones and phase plan

- Canonical validation order and shell-green milestone criteria are documented in `docs/validation-phases.md`.
- CI gates mirror the validation order with explicit jobs: `bootstrap`, `generation`, `dev-compile`, `unit-tests`, and `package-build`.
- Post-shell-green delivery is tracked via Phases A-D with acceptance criteria and rollback-safe increments.

## Run the application

### Prerequisites

- **Go 1.25+** (module `go 1.25.0`).
- **Node.js + npm** (frontend is pinned to `npm@10.8.2` in `frontend/package.json`).
- **Wails CLI v2** (repo depends on `github.com/wailsapp/wails/v2 v2.12.0`).
- **Git** (used by `build.bat` to stamp version/commit metadata).

### Provider configuration (required before `dev`)

`PROVIDER_MODE` decides wiring at startup:

- `PROVIDER_MODE=real` (default when unset): uses real ESI/zKill providers.
- `PROVIDER_MODE=noop`: offline/noop providers for local UI development.

In `real` mode, startup requires both base URLs:

- `ESI_BASE_URL` (preferred) or `GOLT_ESI_BASE_URL` (legacy fallback)
- `ZKILL_BASE_URL` (preferred) or `GOLT_ZKILL_BASE_URL` (legacy fallback)

For ESI specifically, precedence is deterministic: **`ESI_BASE_URL` wins; `GOLT_ESI_BASE_URL` is only used when `ESI_BASE_URL` is unset/blank**.

### Environment variable reference (precedence + defaults)

| Variable | Required/optional by mode | Example value | Precedence / defaults |
| --- | --- | --- | --- |
| `PROVIDER_MODE` | Optional (`real` default). `noop` only if explicitly set. | `real` | Checked in order: `PROVIDER_MODE`, then `GOLT_PROVIDER_MODE`; default is `real`. |
| `ESI_BASE_URL` | **Required in `real`**; ignored in `noop`. | `https://esi.evetech.net/latest` | Preferred key for ESI URL. If empty, loader falls back to legacy `GOLT_ESI_BASE_URL`. |
| `GOLT_ESI_BASE_URL` | Optional legacy alias; acts as fallback for `real`. | `https://esi.evetech.net/latest` | Used only when `ESI_BASE_URL` is unset/blank. |
| `ZKILL_BASE_URL` | **Required in `real`**; ignored in `noop`. | `https://zkillboard.com/api` | Preferred key for zKill URL. Falls back to `GOLT_ZKILL_BASE_URL` when empty. |
| `GOLT_ZKILL_BASE_URL` | Optional legacy alias; fallback for `real`. | `https://zkillboard.com/api` | Used only when `ZKILL_BASE_URL` is unset/blank. |
| `PROVIDER_TIMEOUT` | Optional in all modes. | `5s` | Checked first; falls back to `GOLT_PROVIDER_TIMEOUT`; default is `5s`. |
| `GOLT_PROVIDER_TIMEOUT` | Optional legacy alias. | `5s` | Used only when `PROVIDER_TIMEOUT` is unset/blank. |

### Platform-specific env snippets

#### Windows CMD

```bat
set PROVIDER_MODE=real
set ESI_BASE_URL=https://esi.evetech.net/latest
set ZKILL_BASE_URL=https://zkillboard.com/api
set PROVIDER_TIMEOUT=5s
```

#### PowerShell

```powershell
$env:PROVIDER_MODE="real"
$env:ESI_BASE_URL="https://esi.evetech.net/latest"
$env:ZKILL_BASE_URL="https://zkillboard.com/api"
$env:PROVIDER_TIMEOUT="5s"
```

#### macOS/Linux shell

```bash
export PROVIDER_MODE=real
export ESI_BASE_URL=https://esi.evetech.net/latest
export ZKILL_BASE_URL=https://zkillboard.com/api
export PROVIDER_TIMEOUT=5s
```

### Development run + generation workflow

> Use this exact order to avoid stale bindings and startup config surprises.

1. Install frontend dependencies:
   - `build.bat frontend-install` (Windows)
   - or `cd frontend && npm ci`
2. Regenerate Wails bindings after backend API changes:
   - `build.bat wails-generate` (Windows wrapper)
   - or `wails generate module`
3. (Recommended) refresh bindings sentinel:
   - `scripts/update-bindings-sentinel.sh`
4. Start development app:
   - `build.bat dev` (Windows wrapper)
   - or `wails dev`

### Troubleshooting startup configuration

If you run in `real` mode without ESI configured, startup fails with this exact error string:

```text
provider configuration error: mode="real" checked=ESI_BASE_URL,GOLT_ESI_BASE_URL: real provider mode requires ESI_BASE_URL (or GOLT_ESI_BASE_URL) to be set. remediation (Windows): set ESI_BASE_URL=https://esi.evetech.net/latest. remediation (Unix): export ESI_BASE_URL=https://esi.evetech.net/latest
```

Direct fix:

1. Set `ESI_BASE_URL` (or `GOLT_ESI_BASE_URL` as legacy fallback).
2. Ensure `ZKILL_BASE_URL` is also set for `real` mode.
3. Restart `build.bat dev` / `wails dev`.

### Additional build/test commands

- **Tests:** `build.bat test` (or `go test ./...` and `cd frontend && npm test`)
- **Production build:** `build.bat build` (or `wails build -clean -o dist\goLocalThreat.exe`)
