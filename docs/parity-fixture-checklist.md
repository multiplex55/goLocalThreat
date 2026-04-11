# Parity fixture validation harness checklist

This checklist documents how to safely refresh and review backend/frontend parity fixtures for pilot threat metrics.

## Golden pilot profiles

Keep these five profiles in sync across:
- Backend fixture payloads: `internal/providers/zkill/testdata/parity/*.json`
- Frontend fixture definitions: `frontend/src/lib/api/__tests__/fixtures/parityGoldenPilots.fixture.ts`

Profiles:
1. `solo`
2. `gang_fc`
3. `low_activity`
4. `recent_kill_loss`
5. `timestamp_warning`

## What parity means in this harness

Parity-sensitive fields:
- `kills`
- `losses`
- `dangerPercent`
- `soloPercent`
- `avgGangSize`
- `lastKill`
- `lastLoss`
- `mainShip`
- threat-band inputs / derived `threatBand`

The frontend parity matrix rows include:
- endpoint source
- transform path
- expected reference value
- app output
- pass/fail

## Refresh workflow

1. Update backend raw fixtures (`*.stats.json`, `*.detail.json`) first.
2. Run backend transform tests to ensure extraction paths still map correctly.
3. If extraction changes intentionally, update frontend fixture expectations.
4. Run frontend parity harness tests and review parity matrix contract snapshot.
5. Review threat-band expectations for each profile before merging.

## Safe parity-drift review

When a parity test fails:
1. Confirm whether provider shape changed or app transform changed.
2. Verify no accidental fallback to wrong nesting/field path.
3. Treat these changes as high risk:
   - non-null timestamps becoming null unexpectedly
   - `0` vs `null` flips for activity metrics
   - summary replacing valid detail values
4. If drift is intentional, update:
   - raw fixtures
   - expected references
   - this checklist (if policy changed)
5. Require at least one reviewer to check both backend and frontend fixture deltas together.

## Commands

```bash
go test ./internal/providers/zkill ./internal/app
npm --prefix frontend test -- src/lib/api/__tests__/parityHarness.test.ts
```
