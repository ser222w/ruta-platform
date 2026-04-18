#!/usr/bin/env bash
set -euo pipefail
BASE=${1:-https://app.ruta.cam}
ROUTES=(/dashboard/today /dashboard/inbox /dashboard/planning /dashboard/payments /dashboard/reports /portal/booking)

echo "🔍 Smoke test на $BASE"
FAILED=0
for route in "${ROUTES[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "$BASE$route" || echo "000")
  if [[ "$code" == "200" ]]; then
    echo "  ✅ $route → 200"
  else
    echo "  ❌ $route → $code"
    FAILED=1
  fi
done
[[ $FAILED -eq 0 ]] && echo "✅ All smoke tests passed" || { echo "🛑 Smoke failed"; exit 1; }
