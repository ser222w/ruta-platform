---
id: TASK-14
title: Docker healthcheck + /api/health endpoint
status: To Do
assignee: []
created_date: '2026-04-18 14:12'
labels:
  - infra
  - devops
  - quick-win
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Coolify показує "Running (unknown)" замість "Running (healthy)" бо немає Docker HEALTHCHECK директиви та реального /api/health endpoint.

Ref: docs/research-2026-04.md#41-infrastructure

## Acceptance criteria
- /api/health endpoint повертає 200 + JSON {status: ok, db: ok, ts: ...}
- Dockerfile має HEALTHCHECK CMD curl -f http://localhost:3000/api/health
- Coolify status = "Running (healthy)" після deploy
- E2E smoke test перевіряє /api/health

## Non-goals
- Не додавати metrics/prometheus endpoint у цьому task
- Не змінювати wait-deploy.sh логіку (вона вже accept "unknown")

## WSJF
- revenue: 1, impact: 3, effort: 1, risk: 1
- score: 2. Priority: high. Quick win ~2h.
<!-- SECTION:DESCRIPTION:END -->
