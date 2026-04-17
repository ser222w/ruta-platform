#!/bin/bash
# Deploy to production and verify
# Usage: ./scripts/deploy.sh
# Called automatically at end of each chat session

set -e

SERVER="root@178.104.206.63"
SSH="ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no"
APP_URL="https://app.ruta.cam"
COOLIFY_TOKEN="1|q131P669oBtT5rMhdHZk1mGoEzUVUTIR4TCfbvhE0ac83903"
APP_UUID="dgocwo8kco88so4cs4wwc0sg"

echo "🚀 Deploying to production..."

# Push to main (triggers Coolify auto-deploy via GitHub webhook)
git push origin main

echo "⏳ Waiting for Coolify to pick up the deploy (~10s)..."
sleep 10

# Trigger manual deploy as backup
curl -s -X GET \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  "https://cf.ruta.cam/api/v1/deploy?uuid=$APP_UUID" > /dev/null

echo "⏳ Waiting for build to complete (~3 min)..."
sleep 180

# Verify health
echo "🔍 Checking health..."
STATUS=$(curl -s "$APP_URL/api/health" | grep -o '"status":"ok"' || echo "FAIL")

if [ "$STATUS" = '"status":"ok"' ]; then
  echo "✅ Deploy successful — $APP_URL is healthy"
else
  echo "❌ Health check failed — check Coolify logs at https://cf.ruta.cam"
  exit 1
fi

# Playwright smoke test
echo "📸 Smoke test..."
npx playwright screenshot --browser chromium "$APP_URL/auth/sign-in" /tmp/smoke-deploy.png 2>/dev/null && \
  echo "✅ Screenshot saved to /tmp/smoke-deploy.png" || \
  echo "⚠️  Screenshot failed (non-critical)"

echo ""
echo "✅ DEPLOY COMPLETE: $APP_URL"
