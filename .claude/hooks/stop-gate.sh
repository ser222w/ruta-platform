#!/usr/bin/env bash
# Stop gate hook — auto-close task + L1+ guardrail

# v3: Auto-close task if last commit references task-id
BRANCH=$(git branch --show-current 2>/dev/null || echo "")
TASK_ID=$(echo "$BRANCH" | grep -oE 'task-[0-9]+' | head -1 || echo "")
LAST_MSG=$(git log -1 --format=%s 2>/dev/null || echo "")

if [[ -n "$TASK_ID" ]] && echo "$LAST_MSG" | grep -qi "^\(feat\|fix\|merge\).*${TASK_ID}"; then
  if command -v backlog &>/dev/null; then
    backlog task edit "$TASK_ID" --status done 2>/dev/null && \
      echo "✅ Auto-closed: $TASK_ID"
  fi
fi

# v3: L1+ guardrail
CHANGED=$(git diff --stat 2>/dev/null | tail -1 | grep -oE '[0-9]+ file' | grep -oE '[0-9]+' || echo "0")
if [[ "${CHANGED:-0}" -gt "15" ]]; then
  echo "⚠️ L1+ GUARDRAIL: $CHANGED files changed. Review git diff перед push."
fi
