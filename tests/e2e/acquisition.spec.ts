import { test, expect } from '@playwright/test';
import { loginAsCloser } from './helpers';

// ─────────────────────────────────────────────
// E2E: Acquisition Flow
// Chat A — Inquiry → Booking → Payment link
// ─────────────────────────────────────────────

test.describe('Acquisition Flow', () => {
  // Тест 1: Менеджер відкриває /today та бачить UI
  test('today page loads for closer', async ({ page }) => {
    await loginAsCloser(page);
    await page.goto('/dashboard/today');
    await expect(page.locator('h1')).toContainText('Сьогодні');
    await expect(page.locator('text=Нове звернення')).toBeVisible();
  });

  // Тест 2: Менеджер створює Inquiry вручну
  test('manager creates inquiry manually', async ({ page }) => {
    await loginAsCloser(page);
    await page.goto('/dashboard/today');

    // Натискаємо "Нове звернення"
    await page.click('text=Нове звернення');

    // Форма відкрилась
    await expect(page.locator('[role=dialog]')).toBeVisible();

    // Заповнюємо
    await page.fill('[name=phone]', '+380671234567');
    await page.fill('[name=firstName]', 'Тест Гість');

    // Кнопка "Створити" в діалозі
    await page.getByRole('dialog').getByRole('button', { name: 'Створити' }).click();

    // Редирект на сторінку звернення або список оновився
    await page.waitForURL(/\/dashboard\/(inquiries|today)/, { timeout: 10_000 });
  });

  // Тест 3: Список звернень доступний
  test('inquiries list page loads', async ({ page }) => {
    await loginAsCloser(page);
    await page.goto('/dashboard/inquiries');
    await expect(page.locator('h1')).toContainText('Звернення');
  });

  // Тест 4: Список замовлень доступний
  test('bookings list page loads', async ({ page }) => {
    await loginAsCloser(page);
    await page.goto('/dashboard/bookings');
    // Або стара сторінка або нова — обидві мають показати щось
    await expect(page.locator('h1, .text-2xl')).toBeVisible({ timeout: 10_000 });
  });

  // Тест 5: Guest portal без авторизації (з фіктивним токеном → 404)
  test('guest portal shows 404 for invalid token', async ({ page }) => {
    // Не логінимось
    await page.goto('/portal/booking/invalid-token-12345');
    // Має показати 404 (Next.js not-found)
    const content = await page.content();
    expect(
      content.includes('404') || content.includes('not found') || content.includes('not-found')
    ).toBe(true);
  });

  // Тест 6: Sidebar містить "Сьогодні" та "Звернення"
  test('sidebar has Today and Inquiries links', async ({ page }) => {
    await loginAsCloser(page);
    await page.goto('/dashboard/today');

    // Перевіряємо sidebar — посилання "Сьогодні" та "Звернення"
    await expect(page.locator('a[href="/dashboard/today"]').first()).toBeVisible();
    await expect(page.locator('a[href="/dashboard/inquiries"]').first()).toBeVisible();
  });
});
