# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboards.spec.ts >> BI Dashboards >> overdue payments tab renders
- Location: tests/e2e/dashboards.spec.ts:52:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: table, text=Прострочених платежів немає
Expected: visible
Error: Unexpected token "=" while parsing css selector "table, text=Прострочених платежів немає". Did you mean to CSS.escape it?

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for table, text=Прострочених платежів немає

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - generic [ref=e6]:
      - list [ref=e8]:
        - listitem [ref=e9]:
          - button [ref=e10]:
            - img [ref=e12]
      - generic [ref=e16]:
        - generic [ref=e17]:
          - generic [ref=e18]: Sales
          - list [ref=e19]:
            - listitem [ref=e20]:
              - link "Сьогодні" [ref=e21] [cursor=pointer]:
                - /url: /dashboard/today
                - img [ref=e22]
                - generic: Сьогодні
            - listitem [ref=e27]:
              - link "Звернення" [ref=e28] [cursor=pointer]:
                - /url: /dashboard/inquiries
                - img [ref=e29]
                - generic: Звернення
            - listitem [ref=e33]:
              - link "CRM" [ref=e34] [cursor=pointer]:
                - /url: /dashboard/crm
                - img [ref=e35]
                - generic: CRM
            - listitem [ref=e38]:
              - link "Inbox" [ref=e39] [cursor=pointer]:
                - /url: /dashboard/inbox
                - img [ref=e40]
                - generic: Inbox
            - listitem [ref=e42]:
              - link "Calls" [ref=e43] [cursor=pointer]:
                - /url: /dashboard/calls
                - img [ref=e44]
                - generic: Calls
        - generic [ref=e46]:
          - generic [ref=e47]: Operations
          - list [ref=e48]:
            - listitem [ref=e49]:
              - link "Bookings" [ref=e50] [cursor=pointer]:
                - /url: /dashboard/bookings
                - img [ref=e51]
                - generic: Bookings
            - listitem [ref=e53]:
              - link "Rooms" [ref=e54] [cursor=pointer]:
                - /url: /dashboard/rooms
                - img [ref=e55]
                - generic: Rooms
            - listitem [ref=e57]:
              - link "Payments" [ref=e58] [cursor=pointer]:
                - /url: /dashboard/payments
                - img [ref=e59]
                - generic: Payments
        - generic [ref=e61]:
          - generic [ref=e62]: Analytics
          - list [ref=e63]:
            - listitem [ref=e64]:
              - link "Reports" [ref=e65] [cursor=pointer]:
                - /url: /dashboard/reports
                - img [ref=e66]
                - generic: Reports
            - listitem [ref=e69]:
              - link "Planning" [ref=e70] [cursor=pointer]:
                - /url: /dashboard/planning
                - img [ref=e71]
                - generic: Planning
        - list [ref=e76]:
          - listitem [ref=e77]:
            - button "Account" [expanded] [ref=e78]:
              - img [ref=e79]
              - generic [ref=e83]: Account
              - img [ref=e84]
      - list [ref=e87]:
        - listitem [ref=e88]:
          - button "RU RUTA User user@ruta.group" [ref=e89]:
            - generic [ref=e90]:
              - generic [ref=e92]: RU
              - generic:
                - generic: RUTA User
                - generic: user@ruta.group
            - img [ref=e93]
      - button "Toggle Sidebar" [ref=e96]
    - main [ref=e97]:
      - generic [ref=e98]:
        - generic [ref=e99]:
          - button "Toggle Sidebar" [ref=e100]:
            - img
            - generic [ref=e101]: Toggle Sidebar
          - navigation "breadcrumb" [ref=e102]:
            - list [ref=e103]:
              - listitem [ref=e104]:
                - link "Dashboard" [ref=e105] [cursor=pointer]:
                  - /url: /dashboard
              - listitem [ref=e106]:
                - img [ref=e107]
              - link "Payments" [disabled] [ref=e109]
        - generic [ref=e110]:
          - link [ref=e111] [cursor=pointer]:
            - /url: https://github.com/Kiranism/next-shadcn-dashboard-starter
            - img
          - button "Search... ⌘ K" [ref=e114]:
            - img
            - text: Search...
            - generic:
              - generic: ⌘
              - text: K
          - button "Toggle theme" [ref=e115]:
            - img
            - generic [ref=e116]: Toggle theme
          - generic [ref=e118]:
            - generic [ref=e119]: Theme
            - combobox "Theme" [ref=e120]:
              - generic [ref=e121]:
                - img
              - generic: Vercel
              - generic: T T
              - img
          - button "3 Notifications" [ref=e122]:
            - img
            - generic [ref=e123]: "3"
            - generic [ref=e124]: Notifications
      - generic [ref=e125]:
        - generic [ref=e126]:
          - heading "Payments" [level=1] [ref=e127]
          - paragraph [ref=e128]: Графік платежів · оновлюється при refresh
        - generic [ref=e129]:
          - tablist [ref=e130]:
            - tab "Прострочені" [selected] [ref=e131]
            - tab "Очікуються" [ref=e132]
            - tab "Всі" [ref=e133]
          - tabpanel "Прострочені" [ref=e134]
    - generic [ref=e143]:
      - generic [ref=e144]:
        - heading "Documentation" [level=2] [ref=e146]
        - button "Toggle info infobar" [ref=e148]:
          - img
          - generic [ref=e149]: Toggle Infobar
      - generic [ref=e154]:
        - heading "Getting Started" [level=3] [ref=e155]
        - paragraph [ref=e156]: Learn how to get started with this application.
        - generic [ref=e157]:
          - heading "Learn more" [level=4] [ref=e158]
          - list [ref=e159]:
            - listitem [ref=e160]:
              - link "Installation Guide" [ref=e161] [cursor=pointer]:
                - /url: "#"
                - generic [ref=e162]: Installation Guide
                - img [ref=e163]
      - button "Toggle Infobar" [ref=e165]
  - generic [ref=e166]:
    - img [ref=e168]
    - button "Open Tanstack query devtools" [ref=e216] [cursor=pointer]:
      - img [ref=e217]
  - button "Open Next.js Dev Tools" [ref=e270] [cursor=pointer]:
    - img [ref=e271]
  - alert [ref=e274]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { loginAs, loginAsAdmin, loginAsCloser } from './helpers';
  3  | 
  4  | const loginAsRevenue = (p: Parameters<typeof loginAs>[0]) =>
  5  |   loginAs(p, 'revenue@ruta.cam');
  6  | 
  7  | // ─────────────────────────────────────────────
  8  | // E2E: BI Dashboards (Chat D)
  9  | // ─────────────────────────────────────────────
  10 | 
  11 | test.describe('BI Dashboards', () => {
  12 |   // Тест 1: ADMIN бачить /planning з KPI картками
  13 |   test('admin sees planning KPIs', async ({ page }) => {
  14 |     await loginAsAdmin(page);
  15 |     await page.goto('/dashboard/planning');
  16 |     await expect(page.locator('h1')).toContainText('Planning');
  17 |     // KPI картки
  18 |     await expect(page.locator('[data-testid=kpi-revenue]')).toBeVisible();
  19 |     await expect(page.locator('[data-testid=kpi-adr]')).toBeVisible();
  20 |     await expect(page.locator('[data-testid=kpi-occupancy]')).toBeVisible();
  21 |   });
  22 | 
  23 |   // Тест 2: CLOSER не бачить /planning (RBAC — отримує FORBIDDEN або редирект)
  24 |   test('closer gets forbidden on planning', async ({ page }) => {
  25 |     await loginAsCloser(page);
  26 |     await page.goto('/dashboard/planning');
  27 |     // Або помилка FORBIDDEN від tRPC (сторінка рендериться, але дані не завантажуються)
  28 |     // Або редирект — залежить від middleware
  29 |     // Перевіряємо що KPI картки НЕ показуються (дані заблоковані на рівні tRPC)
  30 |     await page.waitForTimeout(2000);
  31 |     const kpiCard = page.locator('[data-testid=kpi-revenue]');
  32 |     // Може бути FORBIDDEN — картки не з'являться (дані не завантажаться)
  33 |     // або редирект на /today
  34 |     const url = page.url();
  35 |     const isRedirected = url.includes('/today') || url.includes('/crm') || url.includes('/inbox');
  36 |     const hasKpi = await kpiCard.isVisible().catch(() => false);
  37 |     // Один з двох варіантів: редирект або картки відсутні
  38 |     expect(isRedirected || !hasKpi).toBeTruthy();
  39 |   });
  40 | 
  41 |   // Тест 3: /payments завантажується для ADMIN
  42 |   test('admin sees payments page with tabs', async ({ page }) => {
  43 |     await loginAsAdmin(page);
  44 |     await page.goto('/dashboard/payments');
  45 |     await expect(page.locator('h1')).toContainText('Payments');
  46 |     await expect(page.locator('text=Прострочені')).toBeVisible();
  47 |     await expect(page.locator('text=Очікуються')).toBeVisible();
  48 |     await expect(page.locator('text=Всі')).toBeVisible();
  49 |   });
  50 | 
  51 |   // Тест 4: Payments tab "Прострочені" рендериться без помилок
  52 |   test('overdue payments tab renders', async ({ page }) => {
  53 |     await loginAsAdmin(page);
  54 |     await page.goto('/dashboard/payments');
  55 |     // Tab вже активний за замовчуванням
  56 |     // Чекаємо на table або empty state
  57 |     await expect(
  58 |       page.locator('table, text=Прострочених платежів немає')
> 59 |     ).toBeVisible({ timeout: 5000 });
     |       ^ Error: expect(locator).toBeVisible() failed
  60 |   });
  61 | 
  62 |   // Тест 5: /reports завантажується
  63 |   test('admin sees reports page', async ({ page }) => {
  64 |     await loginAsAdmin(page);
  65 |     await page.goto('/dashboard/reports');
  66 |     await expect(page.locator('h1')).toContainText('Reports');
  67 |     await expect(page.locator('text=Воронка по місяцях')).toBeVisible();
  68 |   });
  69 | 
  70 |   // Тест 6: /today має EOD Progress widget
  71 |   test('today page has EOD progress widget', async ({ page }) => {
  72 |     await loginAsCloser(page);
  73 |     await page.goto('/dashboard/today');
  74 |     await expect(page.locator('h1')).toContainText('Сьогодні');
  75 |     // EOD Mission Banner завжди є
  76 |     await expect(
  77 |       page.locator('text=Завершення дня').first()
  78 |     ).toBeVisible({ timeout: 5000 });
  79 |   });
  80 | 
  81 |   // Тест 7: Planning page loads within 3 seconds
  82 |   test('planning page loads within 3 seconds', async ({ page }) => {
  83 |     await loginAsAdmin(page);
  84 |     const start = Date.now();
  85 |     await page.goto('/dashboard/planning');
  86 |     await page.waitForLoadState('networkidle');
  87 |     const elapsed = Date.now() - start;
  88 |     expect(elapsed).toBeLessThan(3000);
  89 |   });
  90 | });
  91 | 
```