import { db } from '@/server/db';
import { randomUUID } from 'crypto';

const TOKEN_EXPIRES_HOURS = 72;

/**
 * Генерує унікальний portal token для бронювання.
 * Токен дійсний 72 години.
 * Записує portalToken + tokenExpiresAt в Booking.
 */
export async function generatePortalToken(
  bookingId: string
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRES_HOURS * 60 * 60 * 1000);

  await db.booking.update({
    where: { id: bookingId },
    data: {
      portalToken: token,
      tokenExpiresAt: expiresAt
    }
  });

  return { token, expiresAt };
}

/**
 * Знаходить Booking за portal token і перевіряє термін дії.
 * Повертає null якщо токен прострочено або не знайдено.
 */
export async function getBookingByPortalToken(token: string) {
  const booking = await db.booking.findUnique({
    where: { portalToken: token },
    include: {
      property: { select: { id: true, name: true, slug: true, liqpayPublicKey: true } },
      guest: { select: { id: true, name: true, phone: true } },
      tariff: { select: { id: true, name: true, mealPlan: true } },
      roomLines: {
        include: { roomCategory: { select: { id: true, name: true } } }
      },
      paymentLines: { orderBy: { sequence: 'asc' } }
    }
  });

  if (!booking) return null;

  // Перевіряємо термін дії
  if (booking.tokenExpiresAt && booking.tokenExpiresAt < new Date()) {
    return null;
  }

  return booking;
}
