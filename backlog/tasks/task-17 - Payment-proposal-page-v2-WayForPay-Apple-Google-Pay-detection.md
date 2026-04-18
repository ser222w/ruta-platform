---
id: TASK-17
title: 'Payment proposal page v2: WayForPay + Apple/Google Pay detection'
status: To Do
assignee: []
created_date: '2026-04-18 14:12'
labels:
  - payments
  - conversion
  - frontend
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Оновлення payment proposal page для підвищення конверсії.
Додати WayForPay як альтернативу LiqPay + автодетектування Apple Pay / Google Pay по UA/browser.

Ref: docs/research-2026-04.md#32-mentioned-у-docsconversations
Depends on: TASK-6 (Meta inbox) must be in production (payment flow linked to booking inquiry)

## Acceptance criteria
- WayForPay payment option поряд з LiqPay
- Apple Pay кнопка показується тільки на iOS Safari
- Google Pay кнопка показується тільки на Android Chrome
- Payment proposal page A/B ready (feature flag або variant param)
- E2E тест покриває happy path для кожного provider

## Non-goals
- Не переробляти всю payments архітектуру (ADR-002: no Folio)
- Не додавати нові payment providers крім WayForPay

## WSJF
- revenue: 4, impact: 3, effort: 3, risk: 2
- score: 2. Priority: high. Depends on TASK-6.
<!-- SECTION:DESCRIPTION:END -->
