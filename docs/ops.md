# Ops — Ruta OS

## Infrastructure

| Resource | Value |
|---|---|
| Server | Hetzner CX42, `178.104.206.63` |
| SSH | `ssh -tt root@178.104.206.63` (key: `~/.ssh/id_ed25519`, requires `-tt`) |
| Coolify URL | `https://cf.ruta.cam` (not coolify.ruta.cam) |
| App URL | `https://app.ruta.cam` |
| Coolify project UUID | `pgg88ggs4wcgoggsgc8c8ggw` |
| App UUID | `dgocwo8kco88so4cs4wwc0sg` |
| PostgreSQL UUID | `c0coggc8o8s0c0w8gowcoc00` |
| Redis UUID | `e4gos8k44sgwoc88s40s4s0c` |
| GitHub repo | `ser222w/ruta-platform` |
| GitHub webhook hook ID | `606776039` |

---

## Deploy Workflow

### Auto-deploy
```
git push origin main
  → GitHub webhook (hook ID: 606776039) → Coolify
  → Docker build on server (~3-4 min)
  → container restart
```

### Manual trigger
```bash
curl -s -X GET \
  -H "Authorization: Bearer 1|q131P669oBtT5rMhdHZk1mGoEzUVUTIR4TCfbvhE0ac83903" \
  "https://cf.ruta.cam/api/v1/deploy?uuid=dgocwo8kco88so4cs4wwc0sg"
```

### Smoke test after deploy
```bash
npx playwright screenshot --browser chromium https://app.ruta.cam/dashboard/today /tmp/smoke.png
```

### Production migration (via temp container)
```bash
# Run on prod server in Coolify network:
docker run --rm --network coolify \
  -e DATABASE_URL="$PROD_DATABASE_URL" \
  ghcr.io/ser222w/ruta-platform:latest \
  npx prisma migrate deploy --schema ./prisma/schema
```

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
npx playwright test tests/e2e/  # Playwright e2e (6 tests, ~3.4s)
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

# Telephony (Phase 2)
RINGOSTAT_API_KEY=""
RINGOSTAT_WEBHOOK_SECRET=""

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

## External Integrations Status

| System | Purpose | Status |
|---|---|---|
| Ringostat | Call tracking → auto lead creation | Phase 2 |
| LiqPay | Primary payment + webhook | Phase 3 (webhook live) |
| WayForPay | Secondary payment | Phase 3 |
| WhatsApp Cloud API | Omnichannel inbox | Phase 3 |
| Telegraf | Telegram bot + notifications | Phase 3 |
| Soniox/Gladia | STT transcription for calls | Phase 4 |
| Anthropic Claude | Call grading, AI drafts | Phase 4 |
| Booking.com / Yield Planet | Channel manager | Phase 5 |
| KeyCRM | Migration source (read-only) | Phase 1 done |
