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

for forbidden_lockfile in "frontend/pnpm-lock.yaml" "frontend/yarn.lock" "frontend/bun.lockb"; do
  if [[ -e "$forbidden_lockfile" ]]; then
    echo "forbidden frontend lockfile present (npm only policy): $forbidden_lockfile"
    exit 1
  fi
done

if [[ ! -f "frontend/package-lock.json" ]]; then
  echo "missing frontend/package-lock.json (npm lockfile required)"
  exit 1
fi

"$ROOT/scripts/check-bindings-freshness.sh"

echo "repository policy checks passed"
