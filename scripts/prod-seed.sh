#!/bin/bash
# Run seed on production via SSH
# Usage: ./scripts/prod-seed.sh
# Requires: SSH access to root@178.104.206.63

set -e

SERVER="root@178.104.206.63"
SSH="ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no"
APP_IMAGE="dgocwo8kco88so4cs4wwc0sg"
NETWORK="coolify"

echo "🌱 Running seed on production..."

# Get DATABASE_URL from running container
DB_URL=$($SSH $SERVER "docker inspect \$(docker ps -q --filter name=$APP_IMAGE) --format '{{range .Config.Env}}{{println .}}{{end}}' | grep DATABASE_URL | cut -d= -f2-")

if [ -z "$DB_URL" ]; then
  echo "❌ Could not get DATABASE_URL from running container"
  exit 1
fi

# Build seeder image from current repo state
echo "📦 Building seeder image..."
$SSH $SERVER "cd /tmp && docker build --target seeder -t ruta-seeder https://github.com/ser222w/ruta-platform.git#main 2>&1 | tail -5"

# Run seed
echo "🚀 Running seed..."
$SSH $SERVER "docker run --rm --network $NETWORK -e DATABASE_URL='$DB_URL' ruta-seeder"

echo "✅ Seed complete"
