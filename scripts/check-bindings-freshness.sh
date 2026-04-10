#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

GENERATED_DIR="frontend/wailsjs"
TS_BINDING="$GENERATED_DIR/go/app/AppService.ts"
SENTINEL="$GENERATED_DIR/.bindings-sentinel"
GO_SERVICE="internal/app/app_service.go"

if [[ ! -f "$TS_BINDING" ]]; then
  echo "missing generated bindings: $TS_BINDING"
  echo "run: build.bat frontend-install && build.bat wails-generate && scripts/update-bindings-sentinel.sh"
  exit 1
fi

if [[ ! -f "$SENTINEL" ]]; then
  echo "missing bindings sentinel: $SENTINEL"
  echo "run: scripts/update-bindings-sentinel.sh"
  exit 1
fi

mapfile -t go_methods < <(
  sed -nE 's/^func \(a \*AppService\) ([A-Z][A-Za-z0-9_]*)\(.*/\1/p' "$GO_SERVICE" \
  | rg -v '^(Startup|Shutdown|SetBuildInfo)$' \
  | sort -u
)

mapfile -t ts_methods < <(
  sed -nE 's/^export function ([A-Z][A-Za-z0-9_]*)\(.*/\1/p' "$TS_BINDING" \
  | sort -u
)

go_joined="$(printf '%s\n' "${go_methods[@]}")"
ts_joined="$(printf '%s\n' "${ts_methods[@]}")"

if [[ "$go_joined" != "$ts_joined" ]]; then
  echo "wails bindings are stale (AppService method mismatch)"
  echo "go methods:"
  printf '  %s\n' "${go_methods[@]}"
  echo "ts methods:"
  printf '  %s\n' "${ts_methods[@]}"
  exit 1
fi

mapfile -t manifest_hashes < <(rg '^sha256 ' "$SENTINEL" | sed 's/^sha256 //')
if [[ ${#manifest_hashes[@]} -eq 0 ]]; then
  echo "sentinel does not contain hashes"
  exit 1
fi

actual_hashes="$(find "$GENERATED_DIR" -type f ! -name '.bindings-sentinel' -print0 | sort -z | xargs -0 sha256sum)"
expected_hashes="$(printf '%s\n' "${manifest_hashes[@]}")"

if [[ "$actual_hashes" != "$expected_hashes" ]]; then
  echo "generated files differ from sentinel; possible manual edits or stale regeneration"
  exit 1
fi

echo "bindings freshness checks passed"
