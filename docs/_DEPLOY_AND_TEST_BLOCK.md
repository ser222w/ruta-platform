<!-- SHARED BLOCK — копіюється в кінець кожного PROMPT_CHAT_*.md -->

---

## Тестування + Auto-Healing (після кожного блоку коду)

### Цикл тестування (виконуй автономно, без питань)

```
НАПИСАВ КОД
    ↓
bun run typecheck
    ↓ помилка?
    YES → читай error → fix → repeat (max 3 спроби)
    NO  ↓
bun run lint
    ↓ помилка?
    YES → fix → repeat
    NO  ↓
bun run test (unit)
    ↓ тест впав?
    YES → читай failure → fix код або fix тест → repeat (max 3 спроби)
          якщо після 3х спроб не виходить → зупинись, поясни Сергію
    NO  ↓
bun run test:e2e (Playwright)
    ↓ e2e впав?
    YES → читай screenshot + trace → fix → repeat (max 3 спроби)
          після 3х → зупинись, поясни
    NO  ↓
✅ ГОТОВО → commit
```

### Auto-healing правила

**TypeScript errors:**
- `Type X is not assignable to Y` → виправ тип, не використовуй `as any`
- `Cannot find module` → перевір import path, `@/` аліас
- `Property does not exist` → перевір Prisma schema generation (`bun run prisma generate`)

**Lint errors:**
- Unused import → видали
- `useEffect` missing deps → додай або `// eslint-disable-line` з поясненням

**Unit test failures:**
- Читай expected vs received → знайди root cause в бізнес-логіці
- НЕ міняй expected value щоб тест пройшов — міняй логіку

**E2E test failures:**
- `element not found` → перевір selector, додай `data-testid` атрибут до компонента
- `timeout` → сторінка не завантажилась → перевір server logs
- `network error` → перевір що dev server запущений і endpoint існує
- Завжди читай Playwright trace: `bunx playwright show-trace test-results/*/trace.zip`

**Playwright setup** (якщо ще немає в проекті):
```bash
bun add -D @playwright/test
bunx playwright install chromium
# tests/e2e/helpers.ts — loginAs, loginAsAdmin, loginAsCloser, loginAsFarmer helpers
```

`playwright.config.ts`:
```typescript
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'bun run dev',
    port: 3000,
    reuseExistingServer: true,
  },
})
```

`tests/e2e/helpers.ts`:
```typescript
import { Page } from '@playwright/test'

export async function loginAs(page: Page, email: string, password = 'Test1234!') {
  await page.goto('/login')
  await page.fill('[name=email]', email)
  await page.fill('[name=password]', password)
  await page.click('button[type=submit]')
  await page.waitForURL(/\/(today|crm|inbox)/)
}

export const loginAsAdmin  = (page: Page) => loginAs(page, 'admin@ruta.cam')
export const loginAsCloser = (page: Page) => loginAs(page, 'closer@ruta.cam')
export const loginAsFarmer = (page: Page) => loginAs(page, 'farmer@ruta.cam')
```

---

## Документування + Деплой (в кінці сесії, AUTO-EXECUTE)

### 1. Оновити CLAUDE.md
В секції CURRENT STATUS додай:
- `✅ Chat X: [назва] — [дата]`
- Нові ключові файли
- Нові ENV variables якщо з'явились

### 2. Оновити CHANGELOG.md
```markdown
## [X.Y.Z] — YYYY-MM-DD — Chat X: Назва

### Added
- [перелік нового функціоналу]
- [нові API endpoints]
- [нові UI сторінки]

### Technical
- [нові Prisma моделі або зміни]
- [нові tRPC procedures]
- [нові npm залежності]
```

### 3. Фінальна перевірка перед push
```bash
bun run typecheck   # 0 errors — обов'язково
bun run lint        # 0 warnings
bun run test        # всі unit тести зелені
bun run build       # production build успішний (важливо!)
```

Якщо `bun run build` падає — fix перед push. Production build != dev server.

### 4. Commit + Push → Auto-deploy
```bash
git add -A
git status          # перевір немає .env або secrets
git commit -m "feat: [назва] — [1 рядок опису]"
git push origin main
# Coolify auto-deploy ~3-4 хв
```

### 5. Smoke-test на prod (app.ruta.cam)
Через 5 хв після push:
- Відкрий app.ruta.cam → перевір що нова фіча є і працює
- Перевір консоль браузера — немає JS errors
- Якщо Sentry DSN налаштований — перевір нових помилок немає
- Якщо є помилка на prod → негайний hotfix → push → recheck

### 6. Фінальний звіт (виведи в чат)
```
✅ Chat [X]: [назва] завершено

Зроблено:
- [пункт 1]
- [пункт 2]

Файли: [N] нових, [M] змінених
Тести: unit [N/N] ✅  e2e [N/N] ✅
Build: ✅ production
Deploy: app.ruta.cam ✅ (або ⚠️ [опис проблеми])

Наступний крок: Chat [Y] — [назва]
Можна паралелити з: Chat [Z], Chat [W]
```
