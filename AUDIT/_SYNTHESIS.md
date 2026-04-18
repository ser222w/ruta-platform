# AUDIT _SYNTHESIS.md — RUTA OS Project Audit
# Generated: 2026-04-18 | Sources: A_domain + B_integrations + C_data + D_automation + E_docs_and_flows

---

## Project Maturity Snapshot

| Metric | Value |
|---|---|
| **Current version** | 0.8.2 |
| **Total features cataloged** | 52 |
| ✅ **DONE** | 32 (62%) |
| 🟡 **WIP** | 7 (13%) |
| 📋 **PLANNED** | 11 (21%) |
| 💀 **STALE** | 0 (0%) |
| ❓ **UNKNOWN** | 2 (4%) |
| **Active dev streams (last 30d)** | Chat B (Ringostat), Inbox Phase 0+1, BI Dashboards |
| **Test coverage signal** | 70% critical path (9 test files, 6/6 acquisition, 16/16 Ringostat) |
| **Database models** | 39 total / 39 migrated / 14 seeded / 0 orphan |
| **API routes** | 8 tRPC routers + 9 webhook routes + 7 REST |
| **UI pages** | 38 pages across 5+ business flows |

---

## Overall Project Health

RUTA OS is a **well-structured, rapidly-delivered MVP** with strong core (acquisition + omnichannel + payments + BI) and clear automation gaps in the retention tier. Architecture is sound: modular Prisma schema, adapter pattern for channels, idempotent webhooks, CASL RBAC.

**Phase:** MVP complete. Next: Task 9 (Farmer Retention) or Task 5 Phase 2 (Meta channels).

---

## Top 5 GAPS (заявлено → відсутнє)

### GAP-1: Farmer Retention Flow (Task 9) — CRITICAL
- **Claimed:** Full T+0→T+180 post-stay automation with wrap-up form, touchpoint tracking, rebook campaigns
- **Reality:** Zero code in src/. Design docs at `docs/tasks/PROMPT_CHAT_E_FARMER.md`. No cron jobs, no task auto-creation, no RetentionCampaign model populated.
- **Impact:** Revenue — rebook conversions not tracked; 20% rebook target unachievable without this
- **Evidence:** `grep -rn "farmer\|retention\|wraup\|wrap_up" src/` returns only DB assignment code, no automation

### GAP-2: EOD Discipline + Cron Infrastructure — HIGH
- **Claimed:** EOD widget with cutoff enforcement, daily progress summary, cron triggers
- **Reality:** EOD widget wireframe exists (`docs/wireframes.md` — "EOD" section). `/dashboard/today` page exists but has no cron-triggered data. No BullMQ jobs instantiated despite dependency in package.json (v5.74.1). No `node-cron` instances. Email poller is the only scheduled job.
- **Impact:** Managers have no structured end-of-day review; overdue tasks not auto-escalated
- **Evidence:** `A_domain.md` — EOD status = PLANNED. `D_automation.md` — "Total active queues: 0"

### GAP-3: Certificate Auto-Issue on CHECKOUT — HIGH
- **Claimed:** 3rd stay → auto-issue ₴6,000 cert; 5th stay → ₴10,000 cert; birthday → ₴3,000 cert
- **Reality:** `Certificate` model exists + validated in `apply-certificate.ts`. Business rules documented in `docs/business-rules.md:70-76`. No CHECKOUT handler that triggers cert creation. No visitCount increment automation found.
- **Impact:** Loyalty program not functional; VIP guests don't receive rewards → churn risk
- **Evidence:** `A_domain.md` — "PLANNED: No CHECKOUT automation visible"

### GAP-4: Missing Env Vars in env.example.txt — MEDIUM
- **Claimed:** All integrations documented
- **Reality:** 6 critical production env vars missing from `env.example.txt`: `LIQPAY_PRIVATE_KEY`, `RINGOSTAT_AUTH_KEY`, `RINGOSTAT_PROJECT_ID`, `META_WEBHOOK_VERIFY_TOKEN`, `TURBOSMS_API_TOKEN`, `TURBOSMS_SENDER_PHONE`
- **Impact:** New developer / deployment will fail silently without these vars
- **Evidence:** `B_integrations.md` — "Missing from env.example.txt" table (6 entries)

### GAP-5: Manager Discount Approval Workflow — MEDIUM
- **Claimed:** Manager discount >10% requires approval (anti-abuse)
- **Reality:** `managerDiscountBlocked` flag set in `calculate-rate.ts:145-146`. No approval workflow, no notification to DIRECTOR role, no manual override UI. Flag is computed but ignored in practice.
- **Impact:** Pricing integrity risk; managers can apply large discounts without oversight
- **Evidence:** `A_domain.md` — "WIP: Flag set; approval workflow missing"

---

## Top 5 HIDDEN ASSETS (реалізовано → недокументовано)

### ASSET-1: Full Idempotent Webhook Infrastructure
All 5 active webhooks (Ringostat, LiqPay, Telegram, eChat, Email) have consistent idempotency via DB unique constraints. This is enterprise-grade pattern not mentioned in any planning doc.
- Evidence: `B_integrations.md` — "Idempotency: YES" for all active integrations

### ASSET-2: Click-to-Call + SIP Status (Ringostat Smart Phone)
Ringostat integration includes bidirectional features: outbound click-to-call from manager dashboard, SIP availability status, employee sync. This goes beyond "webhook integration" in planning docs.
- Evidence: `E_docs_and_flows.md` — `/api/calls/sip-status`, `/api/calls/sync-employees`

### ASSET-3: SSE Real-Time Screen Pop
Incoming call from Ringostat → instant screen pop overlay on all logged-in manager screens with guest LTV + history. Implemented via EventEmitter + SSE (`/api/events`). Not mentioned in architecture.md.
- Evidence: `D_automation.md` — "INCOMING_CALL event → SSE → IncomingCallPopup component"

### ASSET-4: Multi-Property Multi-Bot Inbox Architecture
Inbox is fully multi-tenant: each hotel can have unlimited channel bots (Telegram, eChat, Email) via Inbox table rows. Adding a new hotel = INSERT to DB, zero code change. This scales to N hotels without deployment.
- Evidence: `B_integrations.md` — "Multi-bot Support: YES — unlimited bots per-hotel"

### ASSET-5: Full CASL RBAC with 10/10 Tests
CASL ability-based access control covers all 5 roles (ADMIN/DIRECTOR/CLOSER/FARMER/REVENUE_MANAGER) with client-side nav filtering AND server-side enforcement. 10/10 unit tests passing.
- Evidence: `A_domain.md` — "CASL RBAC: 10/10 tests"

---

## Top 5 RISKS

### RISK-1: BullMQ Never Instantiated (Async Jobs Gap)
BullMQ v5.74.1 is in package.json but zero queues created. All automation runs synchronously in webhook handlers or via setInterval. This means: no retry for failed operations, no job persistence on server restart, no dead-letter queue.
- Severity: MEDIUM — OK for current load; breaking at scale
- ADR-001 references BullMQ as chosen queue system; gap between ADR and reality

### RISK-2: Email Polling Double-Processing Risk
IMAP poller runs as setInterval inside instrumentation.ts AND can be triggered by external Coolify cron via `/api/cron/poll-email`. Same email could be processed twice if both fire simultaneously.
- Severity: MEDIUM — could create duplicate messages in Inbox
- Evidence: `D_automation.md` — "Email polling idempotency gap"

### RISK-3: SSE Inbox Uses DB Polling (3s interval)
`/api/sse` endpoint polls database every 3 seconds per connected manager. With 13 managers × 3s = 4+ DB reads/second at minimum load. Comment in code says "TODO: use pg LISTEN in production."
- Severity: MEDIUM — not blocking now, will degrade under load

### RISK-4: Farmer Retention = 0% Implemented
Task 9 is the primary retention revenue driver. With 150 rooms and seasonal peaks, post-stay rebook automation directly affects ADR and occupancy. Currently: Farmer assigned via LiqPay webhook, but all T+2/T+7/T+30/T+90/T+180 actions require manual work.
- Severity: HIGH — directly affects 20% rebook target in KPIs

### RISK-5: Meta Webhook Stub (FB/IG/WA Channels Not Live)
Meta verification endpoint exists, event processing is stub returning 200. Channels.prisma has FACEBOOK/INSTAGRAM/WHATSAPP enums but zero adapters implemented. If guest contacts via Instagram DM, message is silently dropped.
- Severity: MEDIUM — depends on how many guests use Meta channels (likely growing)

---

## Recommended Next 3 Sprint Items

### Sprint 1: Task 9 — Farmer Retention Flow (W1-W2)
**Why now:** Highest revenue impact, design is complete (`docs/tasks/PROMPT_CHAT_E_FARMER.md`), DB schema ready (Activity, Task models exist). This is the last major MVP feature.
- Deliverables: Wrap-up form, T+0→T+180 task auto-creation, touchpoint tracking, RetentionCampaign + CampaignDispatch models
- Score: Revenue ↑↑↑ | Effort: HIGH | Risk: LOW (clear spec)

### Sprint 2: BullMQ + EOD Cron (W3-W4)
**Why now:** Unblocks all async automation (cert auto-issue, no-show tracking, farmer touchpoints). BullMQ is already in dependencies. EOD widget wireframe is complete.
- Deliverables: Queue setup, EOD cron job, certificate auto-issue on CHECKOUT, /dashboard/today with live cron data
- Score: Revenue ↑↑ | Effort: MEDIUM | Risk: LOW (BullMQ well-documented)

### Sprint 3: env.example.txt + Manager Discount Approval (W5-W6)
**Why now:** Quick wins before any production deployment. Missing env vars block any new dev setup. Manager discount approval is a pricing integrity issue.
- Deliverables: Complete env.example.txt, discount approval modal + DIRECTOR notification, LiqPay unit tests
- Score: Risk↓ | Effort: LOW | Risk: LOW

---

## Cross-Cutting Observations

### Architecture Strengths
1. **Adapter pattern** for channels — zero coupling, infinite scale
2. **Modular Prisma schema** (14 files) — maintainable at 39 models
3. **tRPC end-to-end types** — refactor safe
4. **Idempotent webhooks** — production-grade dedup pattern
5. **CASL on both layers** (client nav + server procedures) — security-in-depth

### Architecture Weaknesses
1. **No job queue** — synchronous-only automation
2. **SSE polling vs LISTEN** — DB load at scale
3. **EventEmitter** — single-server only, no horizontal scaling
4. **No feature flag system** — kill switches require redeploy

### Documentation Quality
- CLAUDE.md is excellent (navigation hub, decision filter, status)
- 3 ADRs accepted, 8+ implicit decisions needing formalization
- README.md is outdated starter template (low priority cleanup)
- Spec docs preserved as historical lineage (ARCHIVE status)

---

## Status Update

Phase 1 (5 subagents): ✅ COMPLETE
_SYNTHESIS.md: ✅ READY FOR REVIEW

PROCEEDING TO PHASE 2 (BLUEPRINT) — автопідтвердження активне.
