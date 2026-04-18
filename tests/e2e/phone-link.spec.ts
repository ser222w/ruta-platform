import { test, expect } from '@playwright/test';
import { loginAsCloser } from './helpers';

// E2E: PhoneLink click-to-call
// Verifies that clicking a phone number in the inquiries list triggers the call action
// (toast appears — success or error both confirm the action fired)

test.describe('PhoneLink click-to-call', () => {
  test('phone number button is visible in inquiry list', async ({ page }) => {
    await loginAsCloser(page);
    await page.goto('/dashboard/inquiries');

    // Page loads with content
    await expect(page.locator('main, [role=main]').first()).toBeVisible({ timeout: 10_000 });

    // PhoneLink buttons are rendered with the correct title
    const phoneButtons = page.locator('button[title="Натисніть щоб зателефонувати"]');
    const count = await phoneButtons.count();

    // If there are inquiries with phone numbers, buttons should be present
    // If the list is empty, skip the click test gracefully
    if (count === 0) {
      test.skip(true, 'No inquiries with phone numbers found — skipping click test');
      return;
    }

    // Button is visible and enabled
    const firstPhone = phoneButtons.first();
    await expect(firstPhone).toBeVisible();
    await expect(firstPhone).toBeEnabled();

    // Phone number text is displayed inside the button (not "Дзвоню...")
    const buttonText = await firstPhone.textContent();
    expect(buttonText).toBeTruthy();
    expect(buttonText).not.toBe('Дзвоню...');
  });

  test('clicking phone button triggers call action and shows toast', async ({ page }) => {
    await loginAsCloser(page);
    await page.goto('/dashboard/inquiries');

    await expect(page.locator('main, [role=main]').first()).toBeVisible({ timeout: 10_000 });

    const phoneButtons = page.locator('button[title="Натисніть щоб зателефонувати"]');
    const count = await phoneButtons.count();

    if (count === 0) {
      test.skip(true, 'No inquiries with phone numbers found — skipping click test');
      return;
    }

    const firstPhone = phoneButtons.first();
    await firstPhone.click();

    // After click: either "Дзвоню..." pending state OR a toast appears
    // Both confirm the action was triggered
    const pendingOrToast = page
      .locator('text=Дзвоню..., [data-sonner-toast], [role=status]')
      .first();

    // Wait for either pending text OR toast (success or error)
    const toastSuccess = page.locator('[data-sonner-toast]').filter({ hasText: 'Дзвінок' });
    const toastError = page.locator('[data-sonner-toast]').filter({ hasText: 'Не вдалося' });
    const pendingText = page.locator('button[title="Натисніть щоб зателефонувати"]').filter({
      hasText: 'Дзвоню...'
    });

    // At least one of: pending state, success toast, or error toast — confirms action fired
    await expect(pendingText.or(toastSuccess).or(toastError).first()).toBeVisible({
      timeout: 5_000
    });
  });

  test('button shows pending state then resolves', async ({ page }) => {
    await loginAsCloser(page);
    await page.goto('/dashboard/inquiries');

    await expect(page.locator('main, [role=main]').first()).toBeVisible({ timeout: 10_000 });

    const phoneButtons = page.locator('button[title="Натисніть щоб зателефонувати"]');
    const count = await phoneButtons.count();

    if (count === 0) {
      test.skip(true, 'No inquiries with phone numbers found — skipping click test');
      return;
    }

    const firstPhone = phoneButtons.first();
    const phoneText = await firstPhone.textContent();

    await firstPhone.click();

    // After action resolves (success or error), button re-enables
    // and shows the phone number again (not "Дзвоню...")
    await expect(firstPhone).toBeEnabled({ timeout: 8_000 });
    await expect(firstPhone).not.toHaveText('Дзвоню...');
    // Phone number text is restored
    if (phoneText) {
      await expect(firstPhone).toHaveText(phoneText.trim());
    }
  });
});
