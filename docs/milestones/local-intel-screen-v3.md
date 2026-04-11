# Local Intel Screen v3 Milestone Checklist

## Scope checklist

- [x] **Single adapter path**
  - `LocalScreen` renders from `AnalyzeState.data.pilots` through `toThreatRowView` and `buildThreatTable` only.
  - No secondary mapping path should bypass the adapter.

- [x] **No placeholder stat defaults**
  - Kills/losses/percentages render exact values from payload when present.
  - Missing stats stay `—` and must not fallback to fabricated defaults (`0`, `Unknown ship`, etc.).

- [x] **3-pane full-height shell**
  - Left roster pane, center threat table pane, and right detail inspector remain available in desktop mode.
  - Responsive tabbed fallback keeps one active pane for constrained widths.

- [x] **Dense threat grid**
  - Threat table supports compact density and keeps score/threat/stat columns visible by default.
  - Keyboard selection and sorting remain available.

- [x] **Detail inspector**
  - Detail pane follows row selection and shows identity, combat stats, reasons, notes, and pilot warnings.

- [x] **Bottom diagnostics strip**
  - Global warning aggregate and timestamp warning counts appear in diagnostics strip.
  - Provider and severity totals remain in diagnostics section.

- [x] **Scope-aware warnings**
  - Pilot-scoped warnings appear on pilot row badge + detail panel.
  - Global warnings do not dump into the detail panel.

## Integration and regression coverage

- [x] `frontend/src/features/local/__tests__/LocalScreen.integration.test.tsx`
  - Full payload rendering assertions for kills/losses/percentages.
  - Partial payload warning routing for pilot vs global warnings.
  - Empty payload rendering safety checks.

- [x] `frontend/src/features/local/__tests__/LocalScreen.regression.timestampWarnings.test.tsx`
  - Regression guard for the “17 pilots + 18 timestamp warnings” scenario.
  - Ensures global warning volume stays in diagnostics strip instead of detail spam.

## Acceptance assertions

- [x] **Table shows real kills/losses/percentages when present.**
- [x] **Global warning count appears only in status strip.**
- [x] **Pilot warning appears in detail pane and row badge.**
- [x] **Selection changes detail panel content and selected row highlight.**

## Rollout plan

1. **Feature flag strategy**
   - Continue gating v3 shell through `useLocalIntelV2Layout` until rollout signoff.
   - Keep fallback path available for emergency rollback in the same release window.

2. **Telemetry hooks (if telemetry pipeline is enabled)**
   - Emit warning category counts per session (global vs pilot scoped; warning code buckets).
   - Emit selection usage metrics (row selection changes, detail pane opens, warning-row selections).
   - Monitor the ratio of sessions where global warning counts are high but detail pane warning volume stays low.

3. **Release validation**
   - Run the integration and regression tests in CI required checks.
   - Track post-release diagnostics trends for timestamp warning handling regressions.
