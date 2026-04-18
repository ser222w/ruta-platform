---
id: TASK-15
title: 'pre-merge CI fix: CHANGELOG [Unreleased] + vitest/playwright separation'
status: To Do
assignee: []
created_date: '2026-04-18 14:12'
labels:
  - ci
  - maintenance
  - quick-win
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Два пов'язані CI issues:
1. CHANGELOG.md не мав [Unreleased] секції → scripts/update-docs.sh не міг додавати entries
2. Треба перевірити claude-full-cycle.yml на дублювання E2E у unit phase

Ref: docs/research-2026-04.md#42-cicd

## Acceptance criteria
- CHANGELOG.md має ## [Unreleased] секцію (вже додано у docs-sync cycle)
- scripts/update-docs.sh коректно додає entry після backlog task create
- .github/workflows/claude-full-cycle.yml: E2E не запускається двічі
- scripts/run-tests.sh: unit (vitest) і e2e (playwright) чітко розділені

## Non-goals
- Не змінювати test coverage threshold
- Не додавати нові тести

## WSJF
- revenue: 0, impact: 2, effort: 1, risk: 0
- score: 1. Priority: medium. ~30min.
<!-- SECTION:DESCRIPTION:END -->
