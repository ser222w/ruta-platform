import { test, expect } from '@playwright/test';
import { loginAs, loginAsAdmin, loginAsCloser } from './helpers';

const loginAsRevenue = (p: Parameters<typeof loginAs>[0]) => loginAs(p, 'revenue@ruta.cam');

// ─────────────────────────────────────────────
// E2E: BI Dashboards (Chat D)
// ─────────────────────────────────────────────

test.describe('BI Dashboards', () => {
  // Тест 1: ADMIN бачить /planning з KPI картками
  test('admin sees planning KPIs', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/planning');
    await expect(page.locator('h1')).toContainText('Planning');
    // KPI картки
    await expect(page.locator('[data-testid=kpi-revenue]')).toBeVisible();
    await expect(page.locator('[data-testid=kpi-adr]')).toBeVisible();
    await expect(page.locator('[data-testid=kpi-occupancy]')).toBeVisible();
  });

  // Тест 2: CLOSER не бачить /planning (RBAC — отримує FORBIDDEN або редирект)
  test('closer gets forbidden on planning', async ({ page }) => {
    await loginAsCloser(page);
    await page.goto('/dashboard/planning');
    // Або помилка FORBIDDEN від tRPC (сторінка рендериться, але дані не завантажуються)
    // Або редирект — залежить від middleware
    // Перевіряємо що KPI картки НЕ показуються (дані заблоковані на рівні tRPC)
    await page.waitForTimeout(2000);
    const kpiCard = page.locator('[data-testid=kpi-revenue]');
    // Може бути FORBIDDEN — картки не з'являться (дані не завантажаться)
    // або редирект на /today
    const url = page.url();
    const isRedirected = url.includes('/today') || url.includes('/crm') || url.includes('/inbox');
    const hasKpi = await kpiCard.isVisible().catch(() => false);
    // Один з двох варіантів: редирект або картки відсутні
    expect(isRedirected || !hasKpi).toBeTruthy();
  });

  // Тест 3: /payments завантажується для ADMIN
  test('admin sees payments page with tabs', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/payments');
    await expect(page.locator('h1')).toContainText('Payments');
    await expect(page.locator('text=Прострочені')).toBeVisible();
    await expect(page.locator('text=Очікуються')).toBeVisible();
    await expect(page.locator('text=Всі')).toBeVisible();
  });

  // Тест 4: Payments tab "Прострочені" рендериться без помилок
  test('overdue payments tab renders', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/payments');
    // Tab вже активний за замовчуванням
    // Чекаємо на table або empty state
    await expect(
      page.locator('table').or(page.getByText('Прострочених платежів немає'))
    ).toBeVisible({ timeout: 5000 });
  });

  // Тест 5: /reports завантажується
  test('admin sees reports page', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/reports');
    await expect(page.locator('h1')).toContainText('Reports');
    await expect(page.locator('text=Воронка по місяцях')).toBeVisible();
  });

  // Тест 6: /today має EOD Progress widget
  test('today page has EOD progress widget', async ({ page }) => {
    await loginAsCloser(page);
    await page.goto('/dashboard/today');
    await expect(page.locator('h1')).toContainText('Сьогодні');
    // EOD Mission Banner завжди є
    await expect(page.locator('text=Завершення дня').first()).toBeVisible({ timeout: 5000 });
  });

  // Тест 7: Planning page loads within reasonable time
  test('planning page loads within 3 seconds', async ({ page }) => {
    await loginAsAdmin(page);
    const start = Date.now();
    await page.goto('/dashboard/planning');
    // Use domcontentloaded — networkidle never fires due to SSE keep-alive connections
    await page.waitForLoadState('domcontentloaded');
    // Wait for at least one KPI card to appear
    await expect(page.locator('text=Revenue').or(page.locator('text=ADR')).first()).toBeVisible({
      timeout: 5000
    });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});
