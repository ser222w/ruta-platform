---
id: ADR-000
status: accepted
date: 2026-04-18
deciders: [sergiy-korin]
supersedes: null
---

# ADR-000: ADR Process

## Context
Lightweight process для architectural decisions. Team = 1 CEO + Claude Code.

## Decision
- Формат: MADR 3.0
- Файли: docs/adr/ADR-NNN-slug.md (3-digit numbering, sequential)
- Lifecycle: proposed → accepted → deprecated/superseded (immutable after accepted)
- Кожен ADR MUST мати: Context, Decision, Consequences
- Superseded ADR НЕ видаляються, мають поле superseded_by: ADR-NNN

## Consequences
- ✅ Нові рішення легко простежуються у git
- ✅ Немає "чому ми так зробили?" через 6 місяців
- ✅ Claude Code при planning читає ADR перед coding (автоматично у cycle.sh)
- ⚠️ Потребує дисципліни — не пропускати ADR для важливих рішень
