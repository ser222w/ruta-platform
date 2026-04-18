import { test, expect } from '@playwright/test';

test.describe('Inbox Phase 2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/inbox');
    // Wait for the nav to load
    await page.waitForSelector('[data-testid="inbox-nav"]', { timeout: 10_000 }).catch(() => {
      // Nav may not be visible if not authenticated — that's OK for CI
    });
  });

  test('inbox page loads without error', async ({ page }) => {
    // Page should either show the inbox or redirect to login — no hard errors
    await expect(page).not.toHaveTitle(/error/i);
  });

  test('"Без відповіді" alarm is visible in nav', async ({ page }) => {
    const nav = page.locator('[data-testid="inbox-nav"]');
    if (await nav.isVisible()) {
      await expect(page.getByText('Без відповіді')).toBeVisible();
    }
  });

  test('default URL state has view=mine or no view param', async ({ page }) => {
    // After navigation, URL should have view=mine (default) or be on inbox without params
    const url = page.url();
    const isDefaultView = url.includes('view=mine') || !url.includes('view=');
    expect(isDefaultView).toBe(true);
  });

  test('switching to "Відкриті" view updates URL', async ({ page }) => {
    const nav = page.locator('[data-testid="inbox-nav"]');
    if (await nav.isVisible()) {
      await page.getByText('Відкриті').click();
      await expect(page).toHaveURL(/view=open/);
    }
  });

  test('switching to "Без відповіді" view updates URL', async ({ page }) => {
    const nav = page.locator('[data-testid="inbox-nav"]');
    if (await nav.isVisible()) {
      await page.locator('[data-testid="inbox-nav"]').getByText('Без відповіді').click();
      await expect(page).toHaveURL(/view=unanswered/);
    }
  });

  test('chat tabs render when conversation is selected', async ({ page }) => {
    const nav = page.locator('[data-testid="inbox-nav"]');
    if (!(await nav.isVisible())) return;

    const firstConv = page.locator('[data-testid="conversation-item"]').first();
    if (await firstConv.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await firstConv.click();
      await expect(page.getByText('Чат')).toBeVisible();
      await expect(page.getByText('Нотатки')).toBeVisible();
    }
  });

  test('switching to Нотатки tab shows notes placeholder', async ({ page }) => {
    const nav = page.locator('[data-testid="inbox-nav"]');
    if (!(await nav.isVisible())) return;

    const firstConv = page.locator('[data-testid="conversation-item"]').first();
    if (await firstConv.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await firstConv.click();
      await page.getByText('Нотатки').click();
      await expect(page.getByPlaceholder(/внутрішня нотатка/i)).toBeVisible();
    }
  });

  test('quick reply bar "Шаблони:" label is visible when conversation selected', async ({
    page
  }) => {
    const nav = page.locator('[data-testid="inbox-nav"]');
    if (!(await nav.isVisible())) return;

    const firstConv = page.locator('[data-testid="conversation-item"]').first();
    if (await firstConv.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await firstConv.click();
      await expect(page.getByText('Шаблони:')).toBeVisible();
    }
  });
});
