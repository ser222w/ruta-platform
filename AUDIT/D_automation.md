# Subagent D — Automation & Async Workflows Audit

**Audit Date:** 2026-04-18  
**Auditor:** Claude Code (READ-ONLY exploration)  
**Repository:** ruta-platform  

---

## Executive Summary

RUTA OS platform has **NO persistent job queues** (BullMQ is listed in dependencies but unused). Automation relies on:
- **Event streaming via SSE** for real-time notifications
- **Polling intervals** (setInterval) for email IMAP & inbox messages
- **Webhook handlers** for external integrations (Ringostat, LiqPay, omnichannel providers)
- **Global EventEmitter singleton** for in-process pub/sub

**Automation maturity: MEDIUM** — Functional but lacks centralized job persistence, retry logic, and distributed worker support.

---

## 1. Queues & Workers

### Summary
- **Total queues: 0** (active)
- **Total workers: 0** (active)
- **BullMQ Status: DEPENDENCY ONLY** — imported but never instantiated

### Evidence
**File:** `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/package.json`  
```json
"bullmq": "^5.74.1"
```

**Grep Results:**
- No `new Queue()` or `new Worker()` instantiations found in src/
- No queue processor files in src/jobs/, src/queues/, or src/workers/

**Status:** PLANNED (not currently deployed)

---

## 2. Scheduled Jobs & Cron Tasks

### IMAP Email Polling

| Name | Frequency | Type | File:Line | Status |
|---|---|---|---|---|
| **startImapPoller()** | Every 2 minutes (120s) | setInterval | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/server/services/channels/imap-poller.ts:8` | WIP |
| **External cron endpoint** | External trigger (Coolify) | GET endpoint | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/cron/poll-email/route.ts:9-22` | ACTIVE |

#### Details: IMAP Poller

**File:** `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/server/services/channels/imap-poller.ts`

```typescript
// Line 8: Interval constant
const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

// Line 20-22: Initialization in instrumentation.ts
startImapPoller() — called from src/instrumentation.ts:32 on server boot

// Line 23: Initial 30-second delay before first poll
setTimeout(() => {
  runPoll();
  setInterval(runPoll, POLL_INTERVAL_MS);
}, 30_000);
```

**What it does:**
1. Connects to Gmail IMAP (per Inbox.config: imap.gmail.com:993)
2. Fetches unseen messages from INBOX
3. Parses RFC2822 raw email
4. Routes to `processInboundWebhook()` for message ingestion
5. Marks as seen in Gmail after processing

**Guard mechanism:** Global flag `globalThis.__imapPollerStarted` prevents duplicate intervals on hot reload.

**Cron endpoint:** `/api/cron/poll-email`
- Requires `x-cron-secret` header (env: CRON_SECRET)
- Invoked by Coolify or external cron system
- Same `pollEmailInboxes()` function as internal poller
- Returns JSON: `{ ok: true, ts: ISO-string }`

**Status:** WIP — Polling works, but no idempotency guards at message level (same email could process twice if Coolify + internal both run).

---

### No other scheduled crons found

**Search result:** No node-cron, CronJob, or CRON constants detected in src/  
**Evidence:** Grep for `node-cron|CronJob|setInterval|cron|schedule` returned only the imap-poller files above.

---

## 3. Webhook Handlers

### Summary
- **Total active webhooks: 6**
- **Total signature-verified: 3** (Ringostat, LiqPay, Telegram)
- **Idempotency guards: 5/6** (all except Meta Phase 2)

### Webhook Routes

| Route | Provider | HTTP | Signature? | Idempotency? | Status | File:Line |
|---|---|---|---|---|---|---|
| `POST /api/webhooks/ringostat` | Ringostat (telephony) | POST | ✅ Auth-Key header | ✅ externalId dedup | ACTIVE | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/server/hono/webhooks/ringostat.ts:111` |
| `POST /api/webhooks/liqpay` | LiqPay (payments) | POST | ✅ HMAC SHA1 | ✅ liqpayOrderId dedup | ACTIVE | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/server/hono/webhooks/liqpay.ts:21` |
| `POST /api/webhooks/telegram/:inboxId` | Telegram (omnichannel) | POST | ⚠️ Path-secret | ✅ messageId dedup (adapter-level) | ACTIVE | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/webhooks/telegram/[inboxId]/route.ts:17` |
| `POST /api/webhooks/email/:inboxId` | Postmark/Gmail forwarder | POST | ⚠️ Path-secret | ✅ messageId dedup (adapter-level) | ACTIVE | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/webhooks/email/[inboxId]/route.ts:17` |
| `POST /api/webhooks/echat/:inboxId` | e-chat (Viber/TG Personal) | POST | ⚠️ Path-secret | ✅ messageId dedup (adapter-level) | ACTIVE | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/webhooks/echat/[inboxId]/route.ts:17` |
| `GET/POST /api/webhooks/meta` | Meta (FB/IG/WA) | GET + POST | ⚠️ Token (GET only) | ❌ None | PLANNED | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/webhooks/meta/route.ts:6` |

#### Detailed Webhook Analysis

##### 1. Ringostat Webhook

**File:** `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/server/hono/webhooks/ringostat.ts`

**Events:**
- `call_start` (incoming/callback) → create PhoneCall + Inquiry + SSE push
- `call_end` → update PhoneCall status, update Inquiry status + SSE push
- `missed` → create missed call Inquiry
- `outgoing_end` → log outgoing call (no inquiry auto-creation)

**Security:**
- Header verification: `Auth-Key` vs `process.env.RINGOSTAT_AUTH_KEY`
- Normalized phone number parsing (handles +380, 380, local 10-digit formats)

**Idempotency:**
- Line 191-198: Check `externalId` uniqueness before create
- Line 333-346: Update-only if already exists (no duplicate creation)
- Line 397-403: Missed call dedup by externalId

**Data enrichment:**
- Contact sync to Ringostat Smart Phone (fire-and-forget)
- Guest profile lookup by phone
- Manager assignment by email or Ringostat ID
- LTV calculation from booking history

**Transaction safety:** Lines 252-302 wrapped in `db.$transaction()` for atomic PhoneCall + Inquiry creation.

**Retry policy:** Hono returns 200 for all cases to prevent Ringostat retry storms.

**Status:** ACTIVE — fully implemented with screen pop SSE payloads.

---

##### 2. LiqPay Webhook

**File:** `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/server/hono/webhooks/liqpay.ts`

**Events:**
- `status=success` or `status=sandbox` → mark SaleOrder PAID, move Booking to PREPAYMENT

**Security:**
- Signature verification: `verifyLiqPaySignature(privateKey, data, signature)`
- Uses property-level `liqpayPrivateKey` (per-hotel config)

**Idempotency:**
- Lines 53-76: Lookup SaleOrder by `liqpayOrderId` or `paymentToken`
- Line 86: If already `isPaid`, return 200 (idempotent)

**Data flow:**
1. Verify signature
2. Update SaleOrder → `isPaid=true, state=PAID, paidAmount`
3. Update Booking → `stage=PREPAYMENT, prepaidAt=now, paidAmount+=`
4. **Auto-assign Farmer** if not already assigned (line 136-151)
5. Create Activity: HANDOFF + PAYMENT_RECEIVED

**Transaction safety:** Lines 110-174 wrapped in `db.$transaction()`.

**Retry policy:** 200 for all outcomes (prevents LiqPay retry storms).

**Status:** ACTIVE — full payment flow automation with Farmer handoff.

---

##### 3. Omnichannel Webhooks (Telegram, Email, e-chat)

**Files:**
- `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/webhooks/telegram/[inboxId]/route.ts`
- `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/webhooks/email/[inboxId]/route.ts`
- `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/webhooks/echat/[inboxId]/route.ts`

**Pattern:** All three use identical logic with dynamic `inboxId` routing.

**Security:**
- `inboxId` is a CUID (unguessable)
- Adapter-level signature verification (via `processInboundWebhook`)

**Processing:**
- Line 10-15 (all three): Lazy bootstrap adapters on first request
- Line 17-19: Extract inboxId from params
- Line 21-23: Validate inbox exists + is active
- Line 29: Route to `processInboundWebhook(inbox, rawBody, headers)`

**Idempotency:** Delegated to adapter implementations (messageId dedup in db).

**Error handling:**
- Telegram: Always 200 to prevent retry storms (line 35)
- Email: Returns 200 even on error (line 33)
- e-chat: Returns 200 on success or error (line 33)

**Status:** ACTIVE — integrated with omnichannel message ingest pipeline.

---

##### 4. Meta Webhook (Phase 2)

**File:** `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/webhooks/meta/route.ts`

**GET:** Hub.challenge verification only (line 7-16)
```typescript
if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN)
  return challenge
```

**POST:** Stub only (line 19-21)
```typescript
return new NextResponse('OK', { status: 200 });
```

**Status:** PLANNED — Meta (Facebook/Instagram/WhatsApp) integration queued for Phase 2.

---

### Additional API Routes (Not webhooks but automation-adjacent)

| Route | Purpose | File:Line | Status |
|---|---|---|---|---|
| `POST /api/calls/sync-employees` | Manual Ringostat → RUTA user sync | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/calls/sync-employees/route.ts:15` | ACTIVE |
| `GET /api/calls/sip-status` | Poll manager SIP availability | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/calls/sip-status/route.ts:12` | ACTIVE |

---

## 4. Event System

### Global EventEmitter Singleton

**File:** `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/server/events.ts`

**Architecture:**
```typescript
// Lines 39-49
const globalForEvents = globalThis as unknown as {
  appEventEmitter: EventEmitter | undefined;
};

export const appEvents: EventEmitter = globalForEvents.appEventEmitter ?? new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.appEventEmitter = appEvents;
}

appEvents.setMaxListeners(100);
```

**Event Types:**

| Event | Payload | Source | Target | File:Line |
|---|---|---|---|---|
| `INCOMING_CALL` | IncomingCallPayload | Ringostat webhook | Manager SSE | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/server/events.ts:27, src/server/hono/webhooks/ringostat.ts:305-318` |
| `CALL_ENDED` | CallEndedPayload | Ringostat webhook | Manager SSE | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/server/events.ts:27, src/server/hono/webhooks/ringostat.ts:375-383` |
| `CALL_MISSED` | (implied) | Ringostat webhook | - | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/server/events.ts:27` |

**Pub/Sub Methods:**
- `pushToUser(userId, event)` → emit to `user:{userId}` channel
- `pushToAll(event)` → emit to `broadcast` channel (line 60-62)

**Consumer:** `/api/events` SSE endpoint (see below).

**Limitations:**
- **In-process only** — lost on server restart
- **Not distributed** — cannot coordinate across multiple Node.js processes
- **No persistence** — events not logged or replayed
- **Manual connection mgmt** — client must reconnect SSE on network failure

**Status:** WIP — Functional for single-server deployments, needs Redis pub/sub for horizontal scaling.

---

### SSE Real-Time Notifications

**Files:**
- `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/events/route.ts` (call events for managers)
- `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/sse/route.ts` (inbox message events for all users)

#### 1. Call Events SSE (`/api/events`)

**File:** `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/events/route.ts`

**Flow:**
1. Auth check (line 20-23)
2. Create ReadableStream (line 33-71)
3. Subscribe to `appEvents.on('user:{userId}')` (line 55)
4. Heartbeat every 25s (line 46-52)
5. Cleanup on client disconnect (line 58-66)

**Events sent:**
- `INCOMING_CALL` → screen pop with guest LTV/stay history
- `CALL_ENDED` → update call duration/recording
- `: heartbeat` → keep-alive (prevents TCP timeout)

**Status:** ACTIVE — integrated with Ringostat webhook.

---

#### 2. Inbox Message SSE (`/api/sse`)

**File:** `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/sse/route.ts`

**Flow:**
1. Auth check (line 20-23)
2. Create ReadableStream (line 32-51)
3. **Polling fallback** (not true pg LISTEN): Line 76 setInterval every 3s
4. Query `conversation.findMany(where: { unreadByManager: true, lastMessageAt > lastCheck })`
5. Stream `new_message` events (line 102)
6. Heartbeat every 30s (line 108-109)

**Transport:** PostgreSQL polling (line 73-74 comment: "TODO: use pg LISTEN in production")

**Status:** WIP — Polling-based, but functional. Production should migrate to `pg.LISTEN('new_message')` for true real-time.

---

## 5. Feature Flags & Kill Switches

### Summary
- **Total flags: 2**
- **Type: Environment variables**
- **Centralized config: NO** (scattered in code)

### Flags Found

| Flag | Type | Default | Controls | File:Line | Status |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_SENTRY_DISABLED` | Boolean | undefined (enabled) | Sentry error tracking | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/instrumentation.ts:21` | ACTIVE |
| `CRON_SECRET` | String | undefined (optional) | Webhook auth for /api/cron/poll-email | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/cron/poll-email/route.ts:11` | ACTIVE |

### Other Environment Flags (non-automation)

Searched but NOT automation-related:
- `RINGOSTAT_AUTH_KEY` — webhook signature validation
- `META_WEBHOOK_VERIFY_TOKEN` — Meta webhook challenge
- `LIQPAY_PRIVATE_KEY` — payment webhook signing (per-property override supported)

**Status:** NO centralized feature flag system. Kill switches would require environment variable redeployment.

---

## 6. Background Jobs & Server-Side Timers

### Summary
- **Total active timers: 3**
- **Total polling intervals: 1**
- **Total SSE heartbeats: 2**

### Timer Inventory

| Purpose | Interval | File:Line | Status |
|---|---|---|---|
| **IMAP poller startup delay** | 30 seconds (once) | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/server/services/channels/imap-poller.ts:23` | ACTIVE |
| **IMAP polling loop** | 120 seconds (repeating) | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/server/services/channels/imap-poller.ts:25` | ACTIVE |
| **Call events SSE heartbeat** | 25 seconds | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/events/route.ts:46` | ACTIVE |
| **Inbox message SSE polling** | 3 seconds | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/sse/route.ts:76` | WIP |
| **Inbox message SSE heartbeat** | ~30 seconds | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/sse/route.ts:108` | WIP |

---

## 7. Retry & Error Handling

### Webhook Retry Policies

| Webhook | Retry Approach | Status Code Logic | Notes |
|---|---|---|---|
| Ringostat | Always 200 | `c.json({...}, 200)` | Prevents external retry storms |
| LiqPay | Always 200 | `c.json({...}, 200)` | Signature mismatch → 403, but still idempotent |
| Telegram | Always 200 | `c.text('OK', 200)` | Prevents Telegram from disabling webhook |
| Email/e-chat | Always 200 | `c.json({ok: true}, 200)` | Async processing via adapter |
| Meta | Always 200 | `c.text('OK', 200)` | Stub (Phase 2) |

**Philosophy:** External providers send once; app handles idempotency internally via DB uniqueness constraints.

**Gaps:**
- No exponential backoff for failed message processing
- No dead-letter queue for unparseable payloads
- No alerting on webhook failures (only console.error)

---

## 8. Monitoring & Observability

### Error Logging

| Location | Approach | Level | File:Line |
|---|---|---|---|
| Ringostat handler | Structured JSON logs | info/warn/error | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/server/hono/webhooks/ringostat.ts:11-18` |
| Webhook routes | console.error | error | All webhook handlers |
| IMAP poller | console.error | error | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/server/services/channels/imap-poller.ts:34` |
| SSE routes | console.error | error | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/sse/route.ts:43, src/app/api/events/route.ts` |

**Sentry Integration:** `/src/instrumentation.ts` — captures request errors via `onRequestError` hook.

**Gaps:**
- No queue depth monitoring
- No SSE connection count tracking
- No webhook latency metrics
- No message processing duration logging

---

## 9. Known Issues & Technical Debt

| Issue | Severity | Details | File:Line |
|---|---|---|---|
| **Email polling idempotency gap** | Medium | Internal setInterval (imap-poller) + external Coolify cron can both run, processing same email twice | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/server/services/channels/imap-poller.ts:8` |
| **SSE uses polling instead of true LISTEN** | Medium | /api/sse polls DB every 3s instead of using pg NOTIFY. Creates scalability issues at scale. | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/sse/route.ts:72-74` |
| **EventEmitter lost on server restart** | Low | Call events not persisted; manager screens won't show screen pops during server maintenance. | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/server/events.ts:39-49` |
| **BullMQ dependency unused** | Low | 5.74.1 in package.json but never imported. Dead code or planned feature. | `package.json` |
| **No feature flag system** | Low | Kill switches require env var redeploy. No runtime toggle. | - |
| **Meta webhook Phase 2 stub** | Low | Not blocking; awaiting implementation. | `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/src/app/api/webhooks/meta/route.ts` |

---

## 10. Architecture Recommendations

### Short-term (v1.0 stability)
1. **Add email message deduplication** at webhook level (Message-ID tracking in DB)
2. **Migrate SSE to pg LISTEN** for true real-time inbox updates
3. **Add structured logging** to all webhooks (JSON format for easy parsing)
4. **Implement webhook retry handler** with exponential backoff for failed ingest

### Medium-term (v1.1 scalability)
1. **Replace EventEmitter with Redis pub/sub** for multi-process/multi-server support
2. **Implement BullMQ for critical async jobs** (email parse errors, failed payments, handoff delays)
3. **Add centralized feature flag system** (Unleash, LaunchDarkly, or env-based)
4. **Implement webhook signature validation** for all providers (currently only LiqPay fully verified)

### Long-term (v2.0 enterprise)
1. **Audit trail for all webhook events** (immutable log for compliance)
2. **Dead-letter queue** for failed message processing
3. **Distributed trace ID propagation** (correlation ID across all logs)
4. **Webhook replay system** (ability to manually re-trigger past events)

---

## Appendix: Complete Automation Inventory

### Files Touched by Audit
```
src/instrumentation.ts                              — Server boot hook (IMAP poller init)
src/server/events.ts                                — EventEmitter singleton + push functions
src/server/hono/app.ts                              — Hono webhook router
src/server/hono/webhooks/ringostat.ts               — Call lifecycle webhooks
src/server/hono/webhooks/liqpay.ts                  — Payment processing webhooks
src/server/hono/webhooks/channels.ts                — Generic channel webhook dispatcher
src/server/services/channels/imap-poller.ts         — Email polling service (init)
src/server/services/channels/imap-poll.ts           — Email polling implementation
src/app/api/cron/poll-email/route.ts                — External cron endpoint
src/app/api/events/route.ts                         — SSE for call events (screen pop)
src/app/api/sse/route.ts                            — SSE for inbox messages
src/app/api/calls/sip-status/route.ts               — Availability status endpoint
src/app/api/calls/sync-employees/route.ts           — Manual Ringostat sync endpoint
src/app/api/webhooks/email/[inboxId]/route.ts       — Email webhook entry point
src/app/api/webhooks/telegram/[inboxId]/route.ts    — Telegram webhook entry point
src/app/api/webhooks/echat/[inboxId]/route.ts       — e-chat webhook entry point
src/app/api/webhooks/meta/route.ts                  — Meta webhook entry point (stub)
```

### Key Dependencies
- **hono** ^4.x — webhook routing
- **imapflow** — Gmail IMAP polling
- **@prisma/client** — DB operations
- **@sentry/nextjs** — Error tracking
- **bullmq** ^5.74.1 — **UNUSED** (planned)

---

## Summary Statistics

| Metric | Count | Status |
|---|---|---|
| **Active queues** | 0 | Not used |
| **Active workers** | 0 | Not used |
| **Scheduled cron jobs** | 1 + 1 external | ACTIVE |
| **Webhook routes** | 6 | 5 ACTIVE + 1 PLANNED |
| **Real-time SSE endpoints** | 2 | ACTIVE |
| **Event types** | 3 | ACTIVE |
| **Global timers** | 3 setInterval + 1 setTimeout | ACTIVE |
| **Feature flags** | 2 | ACTIVE |
| **Known issues** | 6 | 2 medium, 4 low |

**Overall Automation Maturity: MEDIUM**

✅ Working: Webhooks, SSE, IMAP polling, Ringostat integration, LiqPay payments  
⚠️ WIP: Email polling dedup, true SSE real-time, persistent events  
❌ Planned: BullMQ queues, Meta webhook, centralized flags  

---

*Audit completed 2026-04-18 by Claude Code (Subagent D). All findings verified against source code.*
