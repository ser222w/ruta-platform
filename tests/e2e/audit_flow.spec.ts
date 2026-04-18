import { test } from '@playwright/test';
import { loginAsCloser } from './helpers';

test('BOOKING CREATION DEEP AUDIT', async ({ page }) => {
  await loginAsCloser(page);

  // Create fresh inquiry
  await page.goto('/dashboard/today');
  await page.waitForTimeout(800);
  await page.locator('text=Нове звернення').click();
  await page.waitForTimeout(800);
  await page.locator('[role=dialog] [name=phone]').fill('+380671110001');
  await page.locator('[role=dialog] [name=firstName]').fill('BookingAudit');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Створити/i })
    .click();
  await page.waitForTimeout(2000);
  const inquiryUrl = page.url();
  console.log('Inquiry URL:', inquiryUrl);
  await page.screenshot({ path: '/tmp/A1_inquiry_detail.png', fullPage: true });

  // Click "Створити замовлення"
  await page.locator('button:has-text("Створити замовлення")').click();
  await page.waitForTimeout(3000);
  const afterBookingUrl = page.url();
  console.log('URL after Create Booking click:', afterBookingUrl);
  await page.screenshot({ path: '/tmp/A2_after_create_booking.png', fullPage: true });

  // Check for errors, toasts, dialogs
  const toastVisible = await page
    .locator('[data-sonner-toast], [role=alert]')
    .isVisible()
    .catch(() => false);
  console.log('Toast/Alert visible:', toastVisible);
  if (toastVisible) {
    const toastText = await page
      .locator('[data-sonner-toast], [role=alert]')
      .textContent()
      .catch(() => '');
    console.log('Toast text:', toastText);
  }

  const dialogVisible = await page
    .locator('[role=dialog]')
    .isVisible()
    .catch(() => false);
  console.log('Dialog visible after click:', dialogVisible);
  if (dialogVisible) {
    await page.screenshot({ path: '/tmp/A2b_booking_dialog.png' });
    const dlgText = await page
      .locator('[role=dialog]')
      .textContent()
      .catch(() => '');
    console.log('Dialog text (first 400):', dlgText?.substring(0, 400));
    const dlgInputs = await page
      .locator('[role=dialog] input, [role=dialog] select, [role=dialog] [role=combobox]')
      .all();
    for (const inp of dlgInputs) {
      const name = await inp.getAttribute('name').catch(() => '');
      const ph = await inp.getAttribute('placeholder').catch(() => '');
      console.log('  DLG INPUT name=' + name + ' ph=' + ph);
    }
  }

  // Check console errors
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.waitForTimeout(1000);

  // Now check bookings list
  await page.goto('/dashboard/bookings');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/A3_bookings_list.png', fullPage: true });
  const bookingLinks = await page.locator('a[href*="/dashboard/bookings/"]').all();
  console.log('Bookings count:', bookingLinks.length);

  // Check if booking was created via API
  const apiResp = await page.request
    .get(
      'http://localhost:3000/api/trpc/booking.getById?input=' +
        encodeURIComponent(JSON.stringify({ json: { id: 'test' } }))
    )
    .catch(() => null);
  console.log('API check done');

  // Check network - did create booking call succeed?
  // Try tRPC inquiry.convertToBooking manually
  const trpcResp = await page
    .evaluate(async (inquiryId: string) => {
      const parts = inquiryId.split('/');
      const id = parts[parts.length - 1];
      const r = await fetch('/api/trpc/inquiry.convertToBooking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          json: {
            inquiryId: id,
            propertyId: 'clu5xk87x0000ocrv5w5xs8g0',
            checkinDate: '2026-05-01T00:00:00.000Z',
            checkoutDate: '2026-05-03T00:00:00.000Z',
            roomCategoryId: null,
            guests: 2
          }
        })
      });
      const text = await r.text();
      return { status: r.status, body: text.substring(0, 500) };
    }, inquiryUrl)
    .catch((e: Error) => ({ error: e.message }));
  console.log('tRPC convertToBooking test:', JSON.stringify(trpcResp));

  console.log('Collected console errors:', errors);
  console.log('✅ BOOKING AUDIT COMPLETE');
});
