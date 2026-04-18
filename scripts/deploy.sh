#!/bin/bash
# Deploy to production and verify
# Usage: ./scripts/deploy.sh or npm run deploy

set -e

APP_URL="https://app.ruta.cam"
COOLIFY_TOKEN="1|q131P669oBtT5rMhdHZk1mGoEzUVUTIR4TCfbvhE0ac83903"
APP_UUID="dgocwo8kco88so4cs4wwc0sg"
COOLIFY_API="https://cf.ruta.cam/api/v1"

echo "🚀 Deploying to production..."

# Push to main
git push origin main

# Trigger Coolify deploy (GitHub webhook is unreliable — always trigger explicitly)
echo "⚡ Triggering Coolify deploy..."
DEPLOY_UUID=$(curl -s -X GET \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  "$COOLIFY_API/deploy?uuid=$APP_UUID&force=true" | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['deployments'][0]['deployment_uuid'])")

echo "📦 Deployment queued: $DEPLOY_UUID"
echo "⏳ Waiting for build (~3-4 min)..."

# Poll until finished or failed
while true; do
  STATUS=$(curl -s \
    -H "Authorization: Bearer $COOLIFY_TOKEN" \
    "$COOLIFY_API/deployments/$DEPLOY_UUID" | \
    python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))")

  echo "   Status: $STATUS"

  if [ "$STATUS" = "finished" ]; then
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "❌ Deploy FAILED — check logs at https://cf.ruta.cam"
    exit 1
  fi

  sleep 15
done

echo "✅ Build finished"

# Smoke test
echo "🔍 Smoke test..."
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/dashboard/inbox")
if [ "$HTTP" = "200" ]; then
  echo "✅ Smoke test passed ($HTTP)"
else
  echo "❌ Smoke test failed — got $HTTP (expected 200)"
  exit 1
fi

echo ""
echo "✅ DEPLOY COMPLETE: $APP_URL"
