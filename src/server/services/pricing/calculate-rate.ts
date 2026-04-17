import { db } from '@/server/db';
import { findBestPromo } from './find-best-promo';
import { applyCertificate } from './apply-certificate';
import type { LoyaltyTier } from '@prisma/client';

interface CalculateRateInput {
  propertyId: string;
  tariffId: string;
  roomCategoryId: string;
  checkInDate: Date;
  checkOutDate: Date;
  adultsCount: number;
  guestSegment: LoyaltyTier;
  certificateCode?: string;
  managerDiscountPct?: number; // якщо > 10% → блокер
}

export interface PriceBreakdown {
  // Деталі по ночах
  nightlyRates: Array<{ date: string; pricePerNight: number }>;

  // Агреговані суми
  accommodationTotal: number;
  mealTotal: number;
  servicesTotal: number;
  subtotal: number;

  // Знижки
  promoName?: string;
  promoDiscountPct?: number;
  promoDiscountAmount?: number;
  managerDiscountPct: number;
  managerDiscountAmount: number;
  managerDiscountBlocked: boolean; // true якщо > 10% — потрібен апрув

  // Підсумок
  finalTotal: number;

  // Сертифікат
  certificateCode?: string;
  certificateApplied: number;
  paymentDue: number; // finalTotal - certificateApplied

  // Передоплата
  prepayPct: number; // по сегменту гостя
  prepayAmount: number;
  balanceAmount: number;
}

// Відсоток передоплати по сегменту (з CLAUDE.md)
const PREPAY_PCT_BY_SEGMENT: Record<LoyaltyTier, number> = {
  NEW: 50,
  FRIEND: 30,
  FAMILY: 30,
  VIP: 20
};

/**
 * Головний калькулятор ціни (3-layer cascade з CLAUDE.md):
 * 1. BAR × ночі → accommodation_total
 * 2. Meal plan → meal_total (TODO: реалізувати)
 * 3. Services → services_total (TODO: реалізувати)
 * 4. SUBTOTAL = accommodation + meal + services
 * 5. Manager discount (якщо > 10% → блокер)
 * 6. FINAL_TOTAL
 * 7. Certificate → payment_due = max(0, final_total - cert_amount)
 * 8. prepay_pct × payment_due → prepay_amount
 * 9. balance = payment_due - prepay_amount
 */
export async function calculateRate(input: CalculateRateInput): Promise<PriceBreakdown> {
  const {
    propertyId,
    tariffId,
    roomCategoryId,
    checkInDate,
    checkOutDate,
    adultsCount,
    guestSegment,
    certificateCode,
    managerDiscountPct = 0
  } = input;

  // Знаходимо тарифну лінію для цього номера
  const tariffLine = await db.tariffLine.findFirst({
    where: { tariffId, roomCategoryId },
    select: { pricePerNight: true, weekendSurcharge: true, minNights: true }
  });

  if (!tariffLine) {
    throw new Error(
      `Тарифна лінія не знайдена для tariff=${tariffId}, roomCategory=${roomCategoryId}`
    );
  }

  const basePrice = Number(tariffLine.pricePerNight);
  const weekendSurcharge = Number(tariffLine.weekendSurcharge ?? 0);

  // Split nightly pricing: для кожної ночі рахуємо BAR
  const nightlyRates: Array<{ date: string; pricePerNight: number }> = [];
  const current = new Date(checkInDate);

  while (current < checkOutDate) {
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // пт, сб
    const price = basePrice + (isWeekend ? weekendSurcharge : 0);

    nightlyRates.push({
      date: current.toISOString().split('T')[0],
      pricePerNight: price
    });

    current.setDate(current.getDate() + 1);
  }

  const nightsCount = nightlyRates.length;
  const accommodationTotal = nightlyRates.reduce((sum, n) => sum + n.pricePerNight, 0);

  // Meal і services — TODO: Phase 2 (MVP: 0)
  const mealTotal = 0;
  const servicesTotal = 0;
  const subtotal = accommodationTotal + mealTotal + servicesTotal;

  // Знаходимо найкращу акцію
  const promo = await findBestPromo({
    propertyId,
    roomCategoryId,
    checkInDate,
    checkOutDate,
    nightsCount,
    adultsCount,
    guestSegment
  });

  let promoDiscountAmount = 0;
  if (promo) {
    if (promo.discountPct) {
      promoDiscountAmount = Math.round(((subtotal * promo.discountPct) / 100) * 100) / 100;
    } else if (promo.discountAmount) {
      promoDiscountAmount = Math.min(promo.discountAmount, subtotal);
    }
  }

  const afterPromo = subtotal - promoDiscountAmount;

  // Manager discount: якщо > 10% → блокер (manager повинен отримати апрув)
  const managerDiscountBlocked = managerDiscountPct > 10;
  const managerDiscountAmount = Math.round(((afterPromo * managerDiscountPct) / 100) * 100) / 100;
  const finalTotal = afterPromo - managerDiscountAmount;

  // Сертифікат
  let certificateApplied = 0;
  let paymentDue = finalTotal;

  if (certificateCode) {
    const certResult = await applyCertificate({ code: certificateCode, finalTotal });
    certificateApplied = certResult.appliedAmount;
    paymentDue = certResult.newPaymentDue;
  }

  // Передоплата по сегменту
  const prepayPct = promo?.prepayPctOverride ?? PREPAY_PCT_BY_SEGMENT[guestSegment];
  const prepayAmount = Math.round(((paymentDue * prepayPct) / 100) * 100) / 100;
  const balanceAmount = Math.round((paymentDue - prepayAmount) * 100) / 100;

  return {
    nightlyRates,
    accommodationTotal,
    mealTotal,
    servicesTotal,
    subtotal,
    promoName: promo?.name,
    promoDiscountPct: promo?.discountPct ?? undefined,
    promoDiscountAmount: promoDiscountAmount > 0 ? promoDiscountAmount : undefined,
    managerDiscountPct,
    managerDiscountAmount,
    managerDiscountBlocked,
    finalTotal,
    certificateCode,
    certificateApplied,
    paymentDue,
    prepayPct,
    prepayAmount,
    balanceAmount
  };
}
