#!/usr/bin/env bash
# Polling Coolify API до тих пір поки deploy завершиться.
# Env: COOLIFY_API_URL, COOLIFY_API_TOKEN, COOLIFY_APP_UUID
set -euo pipefail

: "${COOLIFY_API_URL:?Set COOLIFY_API_URL}"
: "${COOLIFY_API_TOKEN:?Set COOLIFY_API_TOKEN}"
: "${COOLIFY_APP_UUID:?Set COOLIFY_APP_UUID}"

MAX_WAIT_SEC=${1:-600}
POLL_INTERVAL=10
WAITED=0

echo "⏳ Polling Coolify для app $COOLIFY_APP_UUID..."

while [ $WAITED -lt $MAX_WAIT_SEC ]; do
  STATUS=$(curl -s -H "Authorization: Bearer $COOLIFY_API_TOKEN" \
    "$COOLIFY_API_URL/api/v1/applications/$COOLIFY_APP_UUID" | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','unknown'))" 2>/dev/null || echo "unknown")

  case "$STATUS" in
    "running:healthy"|"running"|"running:unknown")
      echo "✅ Deploy complete ($STATUS) after ${WAITED}s"
      exit 0
      ;;
    "exited"|"failed"|"stopped:unhealthy")
      echo "🛑 Deploy failed ($STATUS) after ${WAITED}s"
      exit 1
      ;;
    *)
      echo "   [$WAITED s] status=$STATUS, waiting..."
      sleep $POLL_INTERVAL
      WAITED=$((WAITED + POLL_INTERVAL))
      ;;
  esac
done

echo "🛑 Timeout after ${MAX_WAIT_SEC}s. Last status: $STATUS"
exit 1
