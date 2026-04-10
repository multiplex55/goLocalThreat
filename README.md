# goLocalThreat
Eve Online Local Threat in Go

## System Boundaries

`goLocalThreat` is organized around a strict boundary between application contracts, domain entities, and infrastructure adapters.

- **Bootstrap (`cmd/golocalthreat`)**
  - Owns process startup only.
  - Wires the Wails-facing service and exits; no business logic.
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
