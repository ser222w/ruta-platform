#!/usr/bin/env bash
# Блокування конкурентного deploy від паралельних агентів
set -euo pipefail
LOCK=/tmp/ruta-deploy.lock
MAX_AGE_SEC=1800

if [[ -f "$LOCK" ]]; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    LOCK_AGE=$(( $(date +%s) - $(stat -f%m "$LOCK") ))
  else
    LOCK_AGE=$(( $(date +%s) - $(stat -c%Y "$LOCK") ))
  fi

  if [[ $LOCK_AGE -lt $MAX_AGE_SEC ]]; then
    echo "🛑 Інший deploy в процесі (age: ${LOCK_AGE}s):"
    cat "$LOCK"
    exit 1
  fi
  echo "⚠️ Stale lock (${LOCK_AGE}s), clearing"
  rm -f "$LOCK"
fi

echo "$(date) pid=$$ branch=$(git branch --show-current) wt=$(pwd)" > "$LOCK"
trap "rm -f $LOCK" EXIT INT TERM
echo "✅ Deploy lock acquired"
