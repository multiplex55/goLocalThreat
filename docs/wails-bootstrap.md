# Wails Bootstrap Notes

This repository now uses a Wails shell bootstrap based on a temporary reference scaffold generated with:

- `wails init -n goLocalThreatShell -t react-ts`

## Scaffold-derived files

These files/directories were copied from the reference scaffold and then lightly adjusted for this repository:

- Root: `wails.json`, `main.go`
- Build metadata/config structure: `build/` (darwin/windows manifests, installer templates, README)
- Frontend shell/build entry files:
  - `frontend/index.html`
  - `frontend/package.json`
  - `frontend/tsconfig.json`
  - `frontend/tsconfig.node.json`
  - `frontend/vite.config.ts`
  - `frontend/src/main.tsx`
  - `frontend/src/App.tsx`, `frontend/src/App.css`, `frontend/src/style.css`, `frontend/src/vite-env.d.ts`
  - `frontend/wailsjs/runtime/*`

## Project-specific wiring

- Existing backend/domain logic under `internal/` was preserved.
- Wails startup now binds `internal/app.AppService` from root `main.go`.
- Build metadata defaults and startup identifiers are centralized in `internal/bootstrap/config.go`.
- Guardrail tests in `internal/bootstrap/config_test.go` validate required bootstrap files and `wails.json` critical keys.

## Binary asset policy

- Binary assets introduced by the temporary scaffold were removed from this repository update.
- `frontend/dist/.gitkeep` is retained so embedded dist wiring remains valid without checked-in build artifacts.
