import { test, expect, request as apiRequest } from '@playwright/test';
import { loginAsCloser } from './helpers';

const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/ringostat';

// ─────────────────────────────────────────────
// E2E: Ringostat Webhook + SSE Screen Pop
// Chat B — Task 8
// ─────────────────────────────────────────────

test.describe('Ringostat Webhook', () => {
  // Тест 1: call_start creates PhoneCall + Inquiry
  test('call_start creates inquiry', async ({ request }) => {
    const callId = `test-e2e-${Date.now()}`;

    const response = await request.post(`${WEBHOOK_URL}?event=call_start`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        call_id: callId,
        caller: '+380671111111',
        dst: '0800123456',
        call_type: 'in',
        utm_source: 'google',
        utm_medium: 'cpc'
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('created');
    expect(body.callId).toBeTruthy();
    expect(body.inquiryId).toBeTruthy();
  });

  // Тест 2: Duplicate call_id is idempotent
  test('duplicate call_id is idempotent', async ({ request }) => {
    const callId = `test-idem-${Date.now()}`;

    // First call
    const r1 = await request.post(`${WEBHOOK_URL}?event=call_start`, {
      headers: { 'Content-Type': 'application/json' },
      data: { call_id: callId, caller: '+380672222222', call_type: 'in' }
    });
    expect(r1.status()).toBe(200);
    const b1 = await r1.json();
    expect(b1.status).toBe('created');

    // Second call — same call_id
    const r2 = await request.post(`${WEBHOOK_URL}?event=call_start`, {
      headers: { 'Content-Type': 'application/json' },
      data: { call_id: callId, caller: '+380672222222', call_type: 'in' }
    });
    expect(r2.status()).toBe(200);
    const b2 = await r2.json();
    expect(b2.status).toBe('duplicate');
    expect(b2.callId).toBe(b1.callId); // same record
  });

  // Тест 3: call_end updates PhoneCall
  test('call_end updates duration and status', async ({ request }) => {
    const callId = `test-end-${Date.now()}`;

    // Create call first
    await request.post(`${WEBHOOK_URL}?event=call_start`, {
      headers: { 'Content-Type': 'application/json' },
      data: { call_id: callId, caller: '+380673333333', call_type: 'in' }
    });

    // End the call
    const response = await request.post(`${WEBHOOK_URL}?event=call_end`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        call_id: callId,
        billsec: 120,
        has_recording: 1,
        recording_wav: 'https://ringostat.net/rec/test.wav'
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('updated');
  });

  // Тест 4: Missed call creates inquiry with nextAction
  test('missed call creates inquiry with callback task', async ({ request }) => {
    const callId = `test-missed-${Date.now()}`;

    const response = await request.post(`${WEBHOOK_URL}?event=missed`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        call_id: callId,
        caller: '+380674444444',
        dst: '0800123456',
        utm_source: 'facebook'
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('created_missed');
    expect(body.callId).toBeTruthy();
    expect(body.inquiryId).toBeTruthy();
  });

  // Тест 5: Unknown event type returns 200 ignored
  test('unknown event type is ignored gracefully', async ({ request }) => {
    const response = await request.post(`${WEBHOOK_URL}?event=unknown_event`, {
      headers: { 'Content-Type': 'application/json' },
      data: { call_id: `test-unknown-${Date.now()}`, caller: '+380675555555' }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ignored');
  });

  // Тест 6: Missing call_id returns 400
  test('missing call_id returns 400', async ({ request }) => {
    const response = await request.post(`${WEBHOOK_URL}?event=call_start`, {
      headers: { 'Content-Type': 'application/json' },
      data: { caller: '+380676666666', call_type: 'in' }
    });

    expect(response.status()).toBe(400);
  });
});

// ─────────────────────────────────────────────
// E2E: Screen Pop UI
// ─────────────────────────────────────────────

test.describe('Ringostat Screen Pop', () => {
  // Тест 7: Incoming call popup appears when SSE event fires
  test('manager sees incoming call popup via SSE', async ({ page, request }) => {
    await loginAsCloser(page);
    await page.goto('/dashboard/today');

    // Trigger webhook (manager_id = closer@ruta.cam)
    const callId = `test-popup-${Date.now()}`;
    await request.post(`${WEBHOOK_URL}?event=call_start`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        call_id: callId,
        caller: '+380677777777',
        call_type: 'in',
        manager_id: 'closer@ruta.cam'
      }
    });

    // Popup повинен з'явитися через SSE
    await expect(page.locator('[data-testid=incoming-call-popup]')).toBeVisible({
      timeout: 5000
    });
  });
});
