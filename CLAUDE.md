# CLAUDE.md — Ruta OS
# Read BEFORE every session. Single source of truth navigation.
# Last updated: 2026-04-17

## WHAT IS THIS

**Ruta OS** — operational platform for RUTA Group (4 hotels, ~170 rooms, Ukraine).
Sales + operations + omnichannel + telephony + payments + BI. Not a CRM.

**Owner:** Sergiy Korin (CEO, product decisions + UX review)
**Lead dev:** Claude Code (90% of code)
**Repo:** `ser222w/ruta-platform`

---

## READ THESE FIRST

| Doc | When |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Stack, project structure, RBAC, pipeline stages, Prisma schema |
| [docs/business-rules.md](docs/business-rules.md) | Pricing, loyalty, payments, user journeys, terminology |
| [docs/ops.md](docs/ops.md) | Deploy workflow, env vars, local dev, test accounts, infra UUIDs |
| [docs/ux-principles.md](docs/ux-principles.md) | P1-P20 UX principles, D1-D26 dev principles, shortcuts, accessibility, metrics |
| [docs/PRINCIPLES.md](docs/PRINCIPLES.md) | CEO manifesto — P1-P10 product + D1-D10 dev principles with rationale (read before product decisions) |
| [docs/wireframes.md](docs/wireframes.md) | 15 ASCII wireframes — Today, Inbox, OrderCard (5 tabs), Calendar, Portal, Wrap-up, ⌘K, EOD widget, Sidebar |
| [docs/data-model.md](docs/data-model.md) | GuestRelation, OrderCompanion, Payer, Touchpoint, RetentionCampaign, AuditLog, birthday cron, Farmer T+0→T+180 |

### Specs & task prompts (read when needed)
| Doc | When |
|---|---|
| [docs/spec/RUTA_CRM_IMPLEMENTATION_v2_7.md](docs/spec/RUTA_CRM_IMPLEMENTATION_v2_7.md) | Full implementation spec (file structure, Prisma, RBAC, server actions) |
| [docs/tasks/PROMPT_CHAT_B_RINGOSTAT.md](docs/tasks/PROMPT_CHAT_B_RINGOSTAT.md) | Task 8: Ringostat webhook → auto lead |
| [docs/tasks/PROMPT_CHAT_C_INBOX.md](docs/tasks/PROMPT_CHAT_C_INBOX.md) | Task 5: Omnichannel Inbox (WhatsApp + Telegram + UI) |
| [docs/tasks/PROMPT_CHAT_D_BI.md](docs/tasks/PROMPT_CHAT_D_BI.md) | Task 10: BI dashboards |
| [docs/tasks/PROMPT_CHAT_E_FARMER.md](docs/tasks/PROMPT_CHAT_E_FARMER.md) | Task 9: Farmer Retention flow |

### Architecture decisions
| ADR | Decision |
|---|---|
| [docs/adr/ADR-001-stack.md](docs/adr/ADR-001-stack.md) | Why Next.js + tRPC + Prisma + BullMQ |
| [docs/adr/ADR-002-no-folio.md](docs/adr/ADR-002-no-folio.md) | No Folio entity — settlement is computed |
| [docs/adr/ADR-003-better-auth.md](docs/adr/ADR-003-better-auth.md) | Better-Auth over Clerk, password hashing format |

---

## DECISION FILTER (run before every feature/field/dependency)

```
□ Revenue↑ or Cost↓?
□ Can this be eliminated entirely?
□ Can it be automated without UI?
□ Is there a ready shadcn/OSS solution?
□ Is this boring tech (3+ years, 10k+ stars)?
□ Can Claude Code maintain this alone?
□ Is there an escape hatch? (see ADR-001)
□ Will a new manager understand this in 30 seconds?
□ Is there a test for the critical path?
□ Is CLAUDE.md / relevant doc updated?
```
**3+ "no" → don't add. Reconsider.**

---

## CRITICAL RULES (always active)

- **Polyana ≠ Polianytsia** — different properties, different slug, NEVER confuse
- **KeyCRM:** order date = FIRST PAYMENT (never creation date)
- **Commits:** always `git config user.name "Sergiy Korin"`, never Co-Authored-By Claude
- **Deploy verify:** always `npx playwright screenshot` after deploy, never "перевір сам"
- **Passwords:** seed uses `hashPassword` from `@better-auth/utils/password` (scrypt, NOT Node.js crypto)
- **Icons:** only from `@/components/icons`, never `@tabler/icons-react` directly
- **Package manager:** `bun` preferred; `npm` fallback if bun not in PATH
- **prisma.config.ts** loads `.env.local` first, then `.env`

---

## CURRENT STATUS

**Phase:** Chat B complete. Next: TASK 5 Phase 2 (Meta) OR TASK 9 (Farmer Retention).

| Task | Status |
|---|---|
| TASK 1: Foundation | ✅ |
| TASK 2: Prisma schema | ✅ |
| TASK 3: CASL RBAC | ✅ 10/10 tests |
| TASK 4: CRM Pipeline UI | ✅ |
| TASK 6: Schema enrichment | ✅ 38 tables |
| TASK 7: Chat A — Acquisition Flow | ✅ 6/6 e2e |
| TASK 5: Omnichannel Inbox | ✅ Phase 0+1 — 2026-04-17 (TG/Email/SMS/e-chat + UI + SSE) |
| TASK 5 Phase 2: Meta (FB/IG/WA) | 🟡 planned separately |
| TASK 8: Ringostat webhook | ✅ Chat B 2026-04-17 — 16/16 e2e |
| TASK 8b: Ringostat Smart Phone | ✅ 2026-04-17 — contact sync, click-to-call, SIP status, outgoing |
| TASK 9: Farmer Retention | 🟡 planned |
| TASK 10: BI Dashboards | ✅ Chat D 2026-04-17 |

**Last commit:** `feat: ringostat smart phone — contact sync, click-to-call, sip status, employee sync`

---

## CHANGELOG

See [CHANGELOG.md](CHANGELOG.md) for full version history.
