---
id: TASK-16
title: 'CQR 3.0 migration: DeepSeek → GPT-4.1-mini'
status: To Do
assignee: []
created_date: '2026-04-18 14:12'
labels:
  - cqr
  - ai
  - sales
  - conversion
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Міграція CQR pipeline з DeepSeek на GPT-4.1-mini для покращення якості аналізу дзвінків.
CQR pipeline: Ringostat → Soniox/Gladia (transcription) → AI model (analysis) → PostgreSQL → Superset

Ref: docs/research-2026-04.md#32-mentioned-у-docsconversations

## Acceptance criteria
- GPT-4.1-mini замінює DeepSeek у CQR analysis step
- Якість scoring верифікована на 10+ реальних дзвінках
- n8n workflow оновлено (новий API endpoint + key)
- Superset dashboards не потребують змін (схема та ж)
- Fallback на DeepSeek якщо GPT-4.1-mini unavailable

## Non-goals
- Не змінювати transcription provider (Soniox/Gladia залишається)
- Не переробляти scoring schema у цьому task

## WSJF
- revenue: 3, impact: 3, effort: 3, risk: 2
- score: 1. Priority: high. Blockers: треба перевірити чи є GPT-4.1-mini API access.
<!-- SECTION:DESCRIPTION:END -->
