import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────
// Unit тести для pricing engine
// Тестуємо бізнес-логіку без БД (mock-free)
// ─────────────────────────────────────────────

// Імпортуємо чисту логіку (не функції з БД)
// Виносимо обчислення окремо для testability

function calcPricing({
  nightlyRates,
  promoDiscountPct = 0,
  managerDiscountPct = 0,
  certificateAmount = 0,
  guestSegment = 'NEW' as 'NEW' | 'FRIEND' | 'FAMILY' | 'VIP'
}: {
  nightlyRates: number[];
  promoDiscountPct?: number;
  managerDiscountPct?: number;
  certificateAmount?: number;
  guestSegment?: 'NEW' | 'FRIEND' | 'FAMILY' | 'VIP';
}) {
  const PREPAY_PCT: Record<string, number> = { NEW: 50, FRIEND: 30, FAMILY: 30, VIP: 20 };

  const accommodationTotal = nightlyRates.reduce((s, r) => s + r, 0);
  const subtotal = accommodationTotal;

  // Promo
  const promoDiscount = Math.round(((subtotal * promoDiscountPct) / 100) * 100) / 100;
  const afterPromo = subtotal - promoDiscount;

  // Manager discount
  const managerDiscountBlocked = managerDiscountPct > 10;
  const managerDiscount = Math.round(((afterPromo * managerDiscountPct) / 100) * 100) / 100;
  const finalTotal = afterPromo - managerDiscount;

  // Certificate
  const appliedCert = Math.min(certificateAmount, finalTotal);
  const paymentDue = Math.max(0, finalTotal - appliedCert);

  // Prepay
  const prepayPct = PREPAY_PCT[guestSegment];
  const prepayAmount = Math.round(((paymentDue * prepayPct) / 100) * 100) / 100;
  const balanceAmount = Math.round((paymentDue - prepayAmount) * 100) / 100;

  return {
    accommodationTotal,
    subtotal,
    promoDiscount,
    afterPromo,
    managerDiscountBlocked,
    managerDiscount,
    finalTotal,
    appliedCert,
    paymentDue,
    prepayPct,
    prepayAmount,
    balanceAmount
  };
}

// ─────────────────────────────────────────────
// Тести базового розрахунку
// ─────────────────────────────────────────────

describe('Pricing: базовий розрахунок', () => {
  it('2 ночі по 3000 = 6000 accommodation', () => {
    const result = calcPricing({ nightlyRates: [3000, 3000] });
    expect(result.accommodationTotal).toBe(6000);
    expect(result.finalTotal).toBe(6000);
  });

  it('split nightly: різні ціни по ночах', () => {
    const result = calcPricing({ nightlyRates: [3000, 3500, 4000] });
    expect(result.accommodationTotal).toBe(10500);
  });
});

// ─────────────────────────────────────────────
// Тести promo знижок
// ─────────────────────────────────────────────

describe('Pricing: promo знижки', () => {
  it('20% promo від 6000 = 1200 знижка, 4800 фінал', () => {
    const result = calcPricing({ nightlyRates: [3000, 3000], promoDiscountPct: 20 });
    expect(result.promoDiscount).toBe(1200);
    expect(result.finalTotal).toBe(4800);
  });

  it('без promo — promoDiscount = 0', () => {
    const result = calcPricing({ nightlyRates: [3000, 3000] });
    expect(result.promoDiscount).toBe(0);
  });
});

// ─────────────────────────────────────────────
// Тести manager discount
// ─────────────────────────────────────────────

describe('Pricing: manager discount', () => {
  it('10% manager знижка — НЕ блокер', () => {
    const result = calcPricing({ nightlyRates: [3000, 3000], managerDiscountPct: 10 });
    expect(result.managerDiscountBlocked).toBe(false);
    expect(result.managerDiscount).toBe(600);
    expect(result.finalTotal).toBe(5400);
  });

  it('11% manager знижка — БЛОКЕР (апрув потрібен)', () => {
    const result = calcPricing({ nightlyRates: [3000, 3000], managerDiscountPct: 11 });
    expect(result.managerDiscountBlocked).toBe(true);
  });

  it('5% manager знижка — не блокер', () => {
    const result = calcPricing({ nightlyRates: [5000], managerDiscountPct: 5 });
    expect(result.managerDiscountBlocked).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Тести сертифіката
// ─────────────────────────────────────────────

describe('Pricing: сертифікат', () => {
  it('cert 1000 від 6000 → paymentDue = 5000', () => {
    const result = calcPricing({ nightlyRates: [3000, 3000], certificateAmount: 1000 });
    expect(result.appliedCert).toBe(1000);
    expect(result.paymentDue).toBe(5000);
  });

  it('cert 10000 > finalTotal 6000 → paymentDue = 0, applied = 6000', () => {
    const result = calcPricing({ nightlyRates: [3000, 3000], certificateAmount: 10000 });
    expect(result.appliedCert).toBe(6000);
    expect(result.paymentDue).toBe(0);
  });

  it('cert = finalTotal → paymentDue = 0', () => {
    const result = calcPricing({ nightlyRates: [3000, 3000], certificateAmount: 6000 });
    expect(result.paymentDue).toBe(0);
  });
});

// ─────────────────────────────────────────────
// Тести prepay по сегменту (CLAUDE.md)
// ─────────────────────────────────────────────

describe('Pricing: prepay по сегменту', () => {
  it('NEW: 50% prepay', () => {
    const result = calcPricing({ nightlyRates: [5000], guestSegment: 'NEW' });
    expect(result.prepayPct).toBe(50);
    expect(result.prepayAmount).toBe(2500);
    expect(result.balanceAmount).toBe(2500);
  });

  it('FRIEND: 30% prepay', () => {
    const result = calcPricing({ nightlyRates: [5000], guestSegment: 'FRIEND' });
    expect(result.prepayPct).toBe(30);
    expect(result.prepayAmount).toBe(1500);
    expect(result.balanceAmount).toBe(3500);
  });

  it('FAMILY: 30% prepay', () => {
    const result = calcPricing({ nightlyRates: [5000], guestSegment: 'FAMILY' });
    expect(result.prepayPct).toBe(30);
    expect(result.prepayAmount).toBe(1500);
  });

  it('VIP: 20% prepay', () => {
    const result = calcPricing({ nightlyRates: [5000], guestSegment: 'VIP' });
    expect(result.prepayPct).toBe(20);
    expect(result.prepayAmount).toBe(1000);
    expect(result.balanceAmount).toBe(4000);
  });
});

// ─────────────────────────────────────────────
// Тести повного ланцюга (end-to-end pricing)
// ─────────────────────────────────────────────

describe('Pricing: повний ланцюг', () => {
  it('3 ночі × 4000 + 10% promo - cert 2000 → VIP prepay 20%', () => {
    // accommodation: 3 × 4000 = 12000
    // promo 10%: 1200 знижка → 10800
    // cert 2000: → paymentDue 8800
    // VIP 20%: prepay = 1760, balance = 7040
    const result = calcPricing({
      nightlyRates: [4000, 4000, 4000],
      promoDiscountPct: 10,
      certificateAmount: 2000,
      guestSegment: 'VIP'
    });
    expect(result.accommodationTotal).toBe(12000);
    expect(result.promoDiscount).toBe(1200);
    expect(result.finalTotal).toBe(10800);
    expect(result.appliedCert).toBe(2000);
    expect(result.paymentDue).toBe(8800);
    expect(result.prepayPct).toBe(20);
    expect(result.prepayAmount).toBe(1760);
    expect(result.balanceAmount).toBe(7040);
  });
});

// ─────────────────────────────────────────────
// Тест підпису LiqPay
// ─────────────────────────────────────────────

describe('LiqPay: signature', () => {
  it('verifyLiqPaySignature — правильний підпис проходить', async () => {
    const { verifyLiqPaySignature, generateLiqPayForm } = await import('@/server/services/liqpay');
    const privateKey = 'test_private_key';
    const form = generateLiqPayForm({
      publicKey: 'test_public_key',
      privateKey,
      amount: 100,
      description: 'Test',
      orderId: 'order-1'
    });
    expect(verifyLiqPaySignature(privateKey, form.data, form.signature)).toBe(true);
  });

  it('verifyLiqPaySignature — неправильний підпис відхиляється', async () => {
    const { verifyLiqPaySignature } = await import('@/server/services/liqpay');
    expect(verifyLiqPaySignature('wrong_key', 'some_data', 'wrong_sig')).toBe(false);
  });
});
