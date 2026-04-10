#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

for forbidden in "./npm" "./wails"; do
  if [[ -e "$forbidden" ]]; then
    echo "forbidden artifact present: $forbidden"
    exit 1
  fi
done

"$ROOT/scripts/check-bindings-freshness.sh"

echo "repository policy checks passed"
