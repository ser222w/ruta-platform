#!/usr/bin/env bash
# Session start hook — context snapshot

# v3: backlog snapshot at session start
if command -v backlog &>/dev/null; then
  echo ""
  echo "=== BACKLOG SNAPSHOT ==="
  backlog board --plain 2>/dev/null | head -30 || echo "(backlog not initialized)"
  echo ""
fi
