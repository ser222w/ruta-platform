import { db } from '@/server/db';
import type { LoyaltyTier } from '@prisma/client';

interface FindBestPromoInput {
  propertyId: string;
  roomCategoryId: string;
  checkInDate: Date;
  checkOutDate: Date;
  nightsCount: number;
  adultsCount: number;
  guestSegment: LoyaltyTier;
}

interface PromoResult {
  id: string;
  name: string;
  discountPct: number | null;
  discountAmount: number | null;
  prepayPctOverride: number | null;
}

/**
 * Алгоритм вибору найкращої акції (з CLAUDE.md):
 * 1. Фільтруємо за property/dates/minNights/minGuests/segment
 * 2. Обираємо найвигіднішу для гостя (найбільший discountPct)
 * 3. При рівній знижці → вищий priority (createdAt ASC — старіша)
 * Акції НЕ комбінуються (isStackable поки не реалізовано)
 */
export async function findBestPromo(input: FindBestPromoInput): Promise<PromoResult | null> {
  const { propertyId, checkInDate, checkOutDate, nightsCount, adultsCount } = input;

  const now = new Date();

  // Знаходимо всі активні акції для цього готелю
  const promotions = await db.promotion.findMany({
    where: {
      isActive: true,
      OR: [
        { propertyId },
        { propertyId: null } // глобальні акції
      ],
      // Вікно бронювання (сьогодні має бути в межах)
      AND: [
        {
          OR: [{ bookingDateFrom: null }, { bookingDateFrom: { lte: now } }]
        },
        {
          OR: [{ bookingDateTo: null }, { bookingDateTo: { gte: now } }]
        },
        // Вікно проживання
        {
          OR: [{ stayDateFrom: null }, { stayDateFrom: { lte: checkInDate } }]
        },
        {
          OR: [{ stayDateTo: null }, { stayDateTo: { gte: checkOutDate } }]
        }
      ]
    },
    orderBy: { createdAt: 'asc' } // старіша при рівному priority
  });

  if (promotions.length === 0) return null;

  // Фільтруємо за minNights і minGuests
  const eligible = promotions.filter((p) => {
    if (p.minNights && nightsCount < p.minNights) return false;
    if (p.minGuests && adultsCount < p.minGuests) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  // Знаходимо найвигіднішу акцію
  const best = eligible.reduce((prev, curr) => {
    const prevPct = Number(prev.discountPct ?? 0);
    const currPct = Number(curr.discountPct ?? 0);
    // Вища знижка → вигідніша
    if (currPct > prevPct) return curr;
    return prev;
  });

  return {
    id: best.id,
    name: best.name,
    discountPct: best.discountPct !== null ? Number(best.discountPct) : null,
    discountAmount: best.discountAmount !== null ? Number(best.discountAmount) : null,
    prepayPctOverride: best.prepayPctOverride
  };
}
