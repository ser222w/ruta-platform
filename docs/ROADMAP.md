---
vision: docs/VISION.md
version: 2026-W16
updated: 2026-04-18
horizon_weeks: 8
next_cooldown: 2026-05-02
---

# RUTA Roadmap — 8 тижнів (W16 → W24)

## Current sprint (W16-W17, до 2026-05-02)

| Item | Pillar | Size | Status | Tasks |
|---|---|---|---|---|
| TASK 5 Phase 2: Meta inbox (FB/IG/WA) | 1-direct | L | 🟡 todo | TASK-6 |
| TASK 9: Farmer Retention T+0→T+180 | 3-repeat | XL | 🟡 todo | TASK-11 |

## Next sprint (W18-W19)

| Item | Pillar | Size | Depends on |
|---|---|---|---|
| Payment proposal page v2 | 1-direct | M | TASK 5 Phase 2 |
| B2B quota rebalance implementation | 2-ops | L | 2026 operating model |

## Backlog depth (W20-W24)

- Docker healthcheck + `/api/health` endpoint (infra, quick win ~2h)
- pre-merge CI fix: exclude Playwright specs from `vitest run` (maintenance, ~15min)
- CQR 3.0 migration: DeepSeek → GPT-4.1-mini (conversion impact, 2-3 days)
- Webflow → Next.js migration (rutapolyana.com) — MUST split before taking (XL)
- Loyalty tier UI
- Andorra entity setup integration (external dependency)

## Decisions pending
<!-- Changed: BullMQ вже обрано у ADR-001 — видалено як "pending" -->
- ADR для Payload CMS vs Sanity (для Webflow міграції)
- Feature flags підхід: env vars vs Unleash

## Completed this period
(заповнюється на cooldown days)
