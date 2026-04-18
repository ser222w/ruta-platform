# Ops — Ruta OS

## Infrastructure

| Resource | Value |
|---|---|
| App server | Hetzner CX33, `178.104.206.63` (Nuremberg) |
| Coolify server | Hetzner, `46.225.219.250` (separate machine) |
| SSH | `ssh -i ~/.ssh/id_ed25519 -tt root@178.104.206.63` (requires `-tt`) |
| Coolify UI | `https://cf.ruta.cam` (NOT coolify.ruta.cam) |
| App URL | `https://app.ruta.cam` |
| Coolify project UUID | `pgg88ggs4wcgoggsgc8c8ggw` |
| App UUID | `dgocwo8kco88so4cs4wwc0sg` |
| PostgreSQL UUID | `c0coggc8o8s0c0w8gowcoc00` (internal host, IP 172.18.0.4) |
| Redis UUID | `e4gos8k44sgwoc88s40s4s0c` |
| GitHub repo | `ser222w/ruta-platform` (**must stay PUBLIC**) |

---

## Deploy Workflow

⚠️ **GitHub webhook is unreliable — ALWAYS trigger Coolify API manually after push.**

### Full deploy sequence (one shot)
```bash
git push origin main && \
  DEPLOY=$(curl -s -X GET \
    -H "Authorization: Bearer 1|q131P669oBtT5rMhdHZk1mGoEzUVUTIR4TCfbvhE0ac83903" \
    "https://cf.ruta.cam/api/v1/deploy?uuid=dgocwo8kco88so4cs4wwc0sg&force=true" | \
    python3 -c "import sys,json; print(json.load(sys.stdin)['deployments'][0]['deployment_uuid'])") && \
  echo "Deployment queued: $DEPLOY" && \
  until curl -s -H "Authorization: Bearer 1|q131P669oBtT5rMhdHZk1mGoEzUVUTIR4TCfbvhE0ac83903" \
    "https://cf.ruta.cam/api/v1/deployments/$DEPLOY" | \
    python3 -c "import sys,json; s=json.load(sys.stdin)['status']; print(s); exit(0 if s in ('finished','failed') else 1)" \
    2>/dev/null; do sleep 15; done && \
  curl -s -o /dev/null -w "Smoke: %{http_code}\n" https://app.ruta.cam/dashboard/inbox
```

### Step-by-step (if debugging)

**1. Push:**
```bash
git push origin main
```

**2. Trigger Coolify:**
```bash
curl -s -X GET \
  -H "Authorization: Bearer 1|q131P669oBtT5rMhdHZk1mGoEzUVUTIR4TCfbvhE0ac83903" \
  "https://cf.ruta.cam/api/v1/deploy?uuid=dgocwo8kco88so4cs4wwc0sg&force=true"
# Response: {"deployments":[{"deployment_uuid":"<uuid>", ...}]}
```

**3. Watch status:**
```bash
# Replace <uuid> with deployment_uuid from step 2
curl -s -H "Authorization: Bearer 1|q131P669oBtT5rMhdHZk1mGoEzUVUTIR4TCfbvhE0ac83903" \
  "https://cf.ruta.cam/api/v1/deployments/<uuid>" | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d['status'])"
# Values: in_progress → finished | failed
```

**4. Smoke test:**
```bash
curl -s -o /dev/null -w "%{http_code}" https://app.ruta.cam/dashboard/inbox
# Expected: 200
```

### Production migration
Standalone image does NOT include prisma CLI. Use temp container:
```bash
ssh -i ~/.ssh/id_ed25519 -tt root@178.104.206.63 "docker run --rm \
  --network coolify \
  --add-host c0coggc8o8s0c0w8gowcoc00:172.18.0.4 \
  -e DATABASE_URL='postgres://ruta:<PASSWORD>@c0coggc8o8s0c0w8gowcoc00:5432/ruta_platform' \
  node:22-slim \
  sh -c 'apt-get update -qq && apt-get install -y -qq openssl git openssh-client 2>/dev/null | tail -1 && \
    GIT_SSH_COMMAND=\"ssh -i /tmp/key -o StrictHostKeyChecking=no\" \
    git clone --depth=1 git@github.com:ser222w/ruta-platform.git /tmp/app 2>&1 | tail -2 && \
    cd /tmp/app && npm install prisma@6 --save-dev --silent 2>&1 | tail -1 && \
    npx prisma@6 migrate deploy --schema ./prisma/schema'; exit"
```

Or directly via psql for simple migrations:
```bash
ssh -i ~/.ssh/id_ed25519 -tt root@178.104.206.63 bash << 'EOF'
docker exec -i c0coggc8o8s0c0w8gowcoc00 psql -U ruta -d ruta_platform << 'SQL'
-- your SQL here
SQL
EOF
```

---

## Coolify Configuration

### Source config (CRITICAL)
Coolify uses **Public GitHub** (source_id=0) — repo must be **public**.

⚠️ **If repo is made private → deploy breaks** with JWT/key error.

Fix broken deploy (SSH to Coolify server):
```bash
ssh -i ~/.ssh/id_ed25519 -tt root@46.225.219.250 "
docker exec coolify-db psql -U coolify -d coolify -c \"
  UPDATE applications
  SET source_id = 0, git_repository = 'ser222w/ruta-platform'
  WHERE uuid = 'dgocwo8kco88so4cs4wwc0sg';
\"
exit"
```
Then retrigger deploy via API.

---

## Local Development

### Prerequisites
- OrbStack (Docker) running
- Node.js 22 LTS
- `.env.local` with local DB credentials

### Start
```bash
docker compose up -d    # PostgreSQL:5432 + Redis:6379
npm run dev             # http://localhost:3000 (264ms Turbopack)
```

### Tests
```bash
npm run test                     # Vitest unit (37 tests)
npx playwright test tests/e2e/  # Playwright e2e (30 tests, ~26 passed / 4 skipped)
```

### Prisma commands (local DB)
```bash
# Migrations
DATABASE_URL="postgresql://ruta:ruta_dev_password@localhost:5432/ruta_platform" \
  ./node_modules/.bin/prisma migrate deploy --schema ./prisma/schema

# Seed (re-run after deleting test users if passwords need reset)
DATABASE_URL="postgresql://ruta:ruta_dev_password@localhost:5432/ruta_platform" \
  ./node_modules/.bin/tsx prisma/seed.ts
```

**Important:**
- `prisma.config.ts` loads `.env.local` first, then `.env` (dotenv fallback)
- Seed uses `@better-auth/utils/password` (scrypt) — same algorithm as Better-Auth
- `.env.local` is in `.gitignore`, never commit

---

## Test Accounts (password: `Test1234!`)

| Email | Role |
|---|---|
| `admin@ruta.cam` | ADMIN |
| `closer@ruta.cam` | CLOSER |
| `farmer@ruta.cam` | FARMER |
| `director@ruta.cam` | DIRECTOR |

---

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://ruta:ruta_dev_password@localhost:5432/ruta_platform"
REDIS_URL="redis://localhost:6379"

# Auth
BETTER_AUTH_SECRET="change-me-in-production"
BETTER_AUTH_URL="http://localhost:3000"    # prod: https://app.ruta.cam

# Email
RESEND_API_KEY=""

# Payments (Phase 3)
LIQPAY_PUBLIC_KEY=""
LIQPAY_PRIVATE_KEY=""
WAYPAY_MERCHANT_ACCOUNT=""
WAYPAY_MERCHANT_SECRET=""

# Telephony — Ringostat (Task 8/8b)
RINGOSTAT_AUTH_KEY="EXepeznFltwOJTYuKDJvGSnnUBcJEcJC"   # Auth-Key з Ringostat Settings > Integrations > API
RINGOSTAT_PROJECT_ID="108065"                              # Project ID
NEXT_PUBLIC_APP_URL="https://app.ruta.cam"                # для посилань в Smart Phone screen pop

# Ringostat webhooks (налаштувати в Ringostat Settings > Integrations > Webhooks 2.0):
# 1. Before call  → https://app.ruta.cam/api/webhooks/ringostat?event=call_start
# 2. After call   → https://app.ruta.cam/api/webhooks/ringostat?event=call_end
# 3. After call (filter: Missed) → https://app.ruta.cam/api/webhooks/ringostat?event=missed
# 4. After outgoing call → https://app.ruta.cam/api/webhooks/ringostat?event=outgoing_end
# All use header: Auth-Key: <RINGOSTAT_AUTH_KEY>
#
# After deploy — sync employees once:
# curl -X POST https://app.ruta.cam/api/calls/sync-employees -H "Cookie: <admin-session>"

# Messaging (Phase 3)
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_ACCESS_TOKEN=""
WHATSAPP_VERIFY_TOKEN=""
TELEGRAM_BOT_TOKEN=""

# AI (Phase 4)
ANTHROPIC_API_KEY=""

# Storage
HETZNER_S3_ENDPOINT=""
HETZNER_S3_ACCESS_KEY=""
HETZNER_S3_SECRET_KEY=""
HETZNER_S3_BUCKET=""

# Observability
SENTRY_DSN=""
AXIOM_API_KEY=""
AXIOM_DATASET=""
```

---

## Chat Completion Checklist (mandatory — кожен чат виконує це в кінці)

Порядок суворий. Не пропускати кроки, не говорити "done" без зелених результатів.

### Крок 1 — Тести коду
```bash
bun run typecheck    # 0 errors — СТОП якщо є, фікс → retry
bun run lint         # 0 warnings — СТОП якщо є, фікс → retry
bun run test         # unit tests зелені
```

**Auto-healing (max 3 спроби на кожен тип):**
- TypeScript error → виправ тип, не використовуй `any`
- Lint error → виправ по правилу, не disable
- Unit fail → виправ логіку або оновлюй snapshot

### Крок 2 — E2E як юзер (Playwright)
```bash
bun run test:e2e     # всі сценарії зелені
```

Тести мають покривати **всі use cases чату** як реальний юзер:
- loginAs(role) → navigate → interact → assert результат
- Happy path + edge cases (пустий стан, помилка, RBAC redirect)
- data-testid на всіх інтерактивних елементах

**Auto-healing:**
- Element not found → перевір selector, додай `data-testid`
- Timeout → збільш `waitForSelector` до 10s
- Auth fail → перевір `loginAs` helper і seed
- Max 3 спроби → якщо не вийшло, commit з `// TODO: fix e2e — <причина>`

### Крок 3 — Документування
```bash
# Обов'язково оновити:
# - CHANGELOG.md — нова версія з описом що зроблено
# - CLAUDE.md CURRENT STATUS — оновити статус task
# - docs/architecture.md — якщо нові роути/сервіси/моделі
# - docs/business-rules.md — якщо нова бізнес-логіка
```

### Крок 4 — Commit і push
```bash
git config user.name "Sergiy Korin"
git config user.email "t5551955@gmail.com"
git add <тільки файли цього чату>   # НІКОЛИ git add -A без перевірки
git commit -m "feat: <назва> — <що зроблено коротко>"
```

### Крок 5 — Deploy (одна команда)
```bash
npm run deploy
# Робить: push → trigger Coolify → чекає 3хв → health check → smoke screenshot
# Якщо fail → читай Coolify logs: https://cf.ruta.cam
```

### Фінальний звіт (вивести в чат)
```
✅ typecheck: 0 errors
✅ lint: 0 warnings
✅ unit tests: X/X passed
✅ e2e tests: X/X passed
✅ CHANGELOG updated: vX.X.X
✅ pushed to main
✅ deployed: app.ruta.cam/dashboard/<сторінка> OK
```

---

## Git Conventions

```bash
git config user.name "Sergiy Korin"
git config user.email "t5551955@gmail.com"
```

- Always commit as Sergiy Korin. Never add Co-Authored-By.
- Branch: `main` (production) + feature branches
- Commit messages: conventional English (`feat:`, `fix:`, `chore:`, `refactor:`)
- Business logic comments: Ukrainian

---

## Omnichannel Inbox — Webhook Setup (Task 5)

### Telegram Bot
1. Create bot via `@BotFather`, get token
2. Create Inbox record in DB (or via admin UI):
   ```sql
   INSERT INTO "Inbox" ("channelType","name","externalId","config","isActive")
   VALUES ('TELEGRAM','My Bot','<bot_username>','{"botToken":"<TOKEN>"}',true);
   ```
3. Set webhook in Telegram:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://app.ruta.cam/api/webhooks/telegram/<INBOX_ID>"
   ```
4. Verify: send message to bot → conversation appears in `/dashboard/inbox`

### e-chat
1. Get API key from e-chat dashboard
2. Create Inbox:
   ```sql
   INSERT INTO "Inbox" ("channelType","name","externalId","config","isActive")
   VALUES ('ECHAT','e-chat Widget','<widget_id>','{"apiKey":"<KEY>"}',true);
   ```
3. Configure webhook URL in e-chat: `https://app.ruta.cam/api/webhooks/echat/<INBOX_ID>`

### Meta (WhatsApp/FB/IG) — Phase 2 (planned)
- Webhook URL: `https://app.ruta.cam/api/webhooks/meta`
- Verification token: `META_WEBHOOK_VERIFY_TOKEN` env var
- Status: stub implemented, adapter pending

### Email (SMTP inbound)
- Webhook URL: `https://app.ruta.cam/api/webhooks/email/<INBOX_ID>`
- Configure MX forwarding in email provider → POST to this URL

### Env vars required
```bash
TELEGRAM_BOT_TOKEN=""        # for outbound replies (per-inbox in DB config)
ECHAT_API_KEY=""             # for outbound replies
META_WEBHOOK_VERIFY_TOKEN="" # for Meta hub.challenge verification
```

---

## External Integrations Status

| System | Purpose | Status |
|---|---|---|
| Ringostat | Call tracking → auto lead creation | ✅ Live (Task 8/8b) |
| Telegram | Omnichannel inbox — inbound messages | ✅ Live (Task 5) |
| e-chat | Omnichannel inbox — website chat | ✅ Live (Task 5) |
| LiqPay | Primary payment + webhook | Phase 3 (webhook live) |
| WayForPay | Secondary payment | Phase 3 |
| WhatsApp Cloud API | Omnichannel inbox | Phase 3 (Meta webhook stub) |
| Facebook / Instagram | Omnichannel inbox | Phase 3 |
| Soniox/Gladia | STT transcription for calls | Phase 4 |
| Anthropic Claude | Call grading, AI drafts | Phase 4 |
| Booking.com / Yield Planet | Channel manager | Phase 5 |
| KeyCRM | Migration source (read-only) | Phase 1 done |
