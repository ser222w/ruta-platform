import { Page } from '@playwright/test';

export async function loginAs(page: Page, email: string, password = 'Test1234!') {
  await page.goto('/auth/sign-in');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type=submit]');
  await page.waitForURL(/\/(today|crm|inbox|bookings|dashboard)/, { timeout: 15_000 });
}

export const loginAsAdmin = (p: Page) => loginAs(p, 'admin@ruta.cam');
export const loginAsCloser = (p: Page) => loginAs(p, 'closer@ruta.cam');
export const loginAsFarmer = (p: Page) => loginAs(p, 'farmer@ruta.cam');

// Note: test users created by prisma/seed.ts with password 'Test1234!'
// Run `npx prisma db seed` before e2e tests
