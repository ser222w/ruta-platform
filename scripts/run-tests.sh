#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "═══════════════════════════════════"
echo "🧪 UNIT + INTEGRATION TESTS"
echo "═══════════════════════════════════"

if [[ -f package.json ]]; then
  if grep -q '"test"' package.json 2>/dev/null; then
    if command -v bun &>/dev/null; then
      # Explicit path to avoid picking up Playwright e2e spec files
      bun test tests/unit/ || { echo "🛑 Unit tests failed"; exit 1; }
    else
      npm test || { echo "🛑 Unit tests failed"; exit 1; }
    fi
  else
    echo "   (no test script in package.json)"
  fi
fi

echo ""
echo "═══════════════════════════════════"
echo "🎭 E2E TESTS (Playwright)"
echo "═══════════════════════════════════"

E2E_DIR=""
for dir in qa/scenarios tests/e2e e2e; do
  if [[ -d "$dir" ]]; then
    E2E_DIR="$dir"
    break
  fi
done

if [[ -n "$E2E_DIR" ]]; then
  WORKTREE_NAME=$(basename "$(pwd)")
  if [[ "$WORKTREE_NAME" =~ ruta-wt- ]]; then
    export PORT=${PORT:-$((3000 + RANDOM % 1000))}
    echo "Worktree detected. PORT=$PORT"
  fi

  npx playwright test "$E2E_DIR" --reporter=list --workers=4 || {
    echo "🛑 E2E failed. HTML report: npx playwright show-report"
    exit 1
  }
else
  echo "⚠️ No e2e directory found (qa/scenarios, tests/e2e, e2e)"
fi

echo ""
echo "✅ All tests passed"
