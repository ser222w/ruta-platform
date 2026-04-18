#!/usr/bin/env bash
# Після feature — оновити docs (CHANGELOG, README links, docs/*)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

TASK_ID=${1:-$(git branch --show-current | grep -oE 'task-[0-9]+' | head -1)}
[ -z "$TASK_ID" ] && { echo "Usage: $0 <task-id>"; exit 1; }

if [ ! -f CHANGELOG.md ]; then
  cat > CHANGELOG.md <<EOF
# Changelog

All notable changes to RUTA Platform.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

## [Unreleased]

EOF
fi

TASK_TITLE=$(backlog task view "$TASK_ID" 2>/dev/null | grep "^Title:" | sed 's/^Title: //' || echo "$TASK_ID")

python3 <<PYEOF
import re

task_id = "$TASK_ID"
task_title = "$TASK_TITLE"

with open("CHANGELOG.md") as f:
    content = f.read()

entry = f"- {task_title} ({task_id})"

if entry in content:
    print(f"   (already in CHANGELOG: {entry})")
    exit(0)

if "## [Unreleased]" not in content:
    content = "## [Unreleased]\n\n### Added\n" + entry + "\n\n" + content
else:
    lines = content.split("\n")
    new_lines = []
    in_unreleased = False
    added_found = False
    inserted = False
    for line in lines:
        new_lines.append(line)
        if line.startswith("## [Unreleased]"):
            in_unreleased = True
        elif in_unreleased and line.startswith("## ") and not line.startswith("## [Unreleased]"):
            in_unreleased = False
        if in_unreleased and line == "### Added" and not inserted:
            added_found = True
            new_lines.append(entry)
            inserted = True
    if not added_found:
        final_lines = []
        for line in new_lines:
            final_lines.append(line)
            if line.startswith("## [Unreleased]") and not inserted:
                final_lines.append("")
                final_lines.append("### Added")
                final_lines.append(entry)
                inserted = True
        new_lines = final_lines
    content = "\n".join(new_lines)

with open("CHANGELOG.md", "w") as f:
    f.write(content)

print(f"✅ CHANGELOG.md updated: {entry}")
PYEOF

if git diff --name-only origin/main...HEAD 2>/dev/null | grep -q "src/app/api/"; then
  if [ -f scripts/gen-api-docs.sh ]; then
    bash scripts/gen-api-docs.sh && echo "✅ API docs regenerated"
  fi
fi

echo "✅ Docs updated for $TASK_ID"
