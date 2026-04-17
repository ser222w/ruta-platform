import { test, expect } from '@playwright/test';
import { loginAsCloser } from './helpers';

test('full flow: inquiry → booking → payment link', async ({ page }) => {
  await loginAsCloser(page);

  // 1. Create inquiry
  await page.goto('/dashboard/today');
  await page.waitForTimeout(800);
  await page.locator('text=Нове звернення').click();
  await page.waitForTimeout(800);
  await page.locator('[role=dialog] [name=phone]').fill('+380672000001');
  await page.locator('[role=dialog] [name=firstName]').fill('Full Flow Test');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Створити/i })
    .click();
  await page.waitForURL(/\/dashboard\/inquiries\//, { timeout: 10_000 });
  const inquiryUrl = page.url();
  console.log('Inquiry created:', inquiryUrl);

  // 2. Property selector loads
  await page.locator('button:has-text("Створити замовлення")').click();
  await page.waitForTimeout(800);
  const dialog = page.locator('[role=dialog]');
  await expect(dialog).toBeVisible();

  // Select hotel from dropdown
  const propertySelect = dialog.locator('[role=combobox]').first();
  await propertySelect.click();
  await page.waitForTimeout(300);
  const options = page.locator('[role=option]');
  const optCount = await options.count();
  console.log('Property options count:', optCount);
  expect(optCount).toBeGreaterThan(0);
  await options.first().click();
  await page.waitForTimeout(200);

  // Fill dates
  const dateInputs = dialog.locator('input[type=date]');
  await dateInputs.nth(0).fill('2026-06-01');
  await dateInputs.nth(1).fill('2026-06-03');

  // Submit
  await dialog.getByRole('button', { name: /Створити замовлення/i }).click();
  await page.waitForURL(/\/dashboard\/bookings\//, { timeout: 15_000 });
  const bookingUrl = page.url();
  console.log('Booking created:', bookingUrl);

  // 3. Check booking detail page
  await expect(page.locator('h1, .font-bold').first()).toBeVisible();
  const tabs = await page.locator('[role=tab]').allTextContents();
  console.log('Tabs:', JSON.stringify(tabs));
  expect(tabs.length).toBeGreaterThan(0);

  // 4. Generate payment link
  const payBtn = page.locator('button:has-text("Надіслати посилання на оплату")');
  await expect(payBtn).toBeVisible();
  await payBtn.click();
  await page.waitForTimeout(1500);

  // Dialog with link
  const linkDialog = page.locator('[role=dialog]');
  await expect(linkDialog).toBeVisible();
  const dialogText = await linkDialog.textContent();
  console.log('Payment dialog text:', dialogText?.substring(0, 200));
  expect(dialogText).toContain('portal');
});

test('bookings list page renders correctly', async ({ page }) => {
  await loginAsCloser(page);
  await page.goto('/dashboard/bookings');
  await page.waitForTimeout(1500);
  await expect(page.locator('h1')).toContainText('Замовлення');
  // Page renders: either table with data, or empty-state message
  const hasTable = await page
    .locator('table')
    .isVisible()
    .catch(() => false);
  const hasEmpty = await page
    .locator('text=Замовлень не знайдено')
    .isVisible()
    .catch(() => false);
  console.log('table visible:', hasTable, '| empty state:', hasEmpty);
  expect(hasTable || hasEmpty).toBe(true);
});
