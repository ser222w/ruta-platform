import type { PrismaClient } from '@prisma/client';

interface GenerateScheduleInput {
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
  bookingId: string;
  totalAmount: number; // сума до сплати після сертифіката
  prepayPct: number; // % передоплати (50/30/20 по сегменту)
  dueDate?: Date; // дата першого платежу (default: сьогодні + 1 день)
  checkInDate?: Date; // дата заїзду (для балансу)
}

/**
 * Генерує PaymentScheduleLine для бронювання:
 * - Лінія 1: prepayAmount (prepayPct% від total) — dueDate або today+1
 * - Лінія 2: balanceAmount (решта) — за 3 дні до заїзду або через 7 днів
 */
export async function generateSchedule(input: GenerateScheduleInput): Promise<void> {
  const { tx, bookingId, totalAmount, prepayPct, dueDate, checkInDate } = input;

  // Розраховуємо суми
  const prepayAmount = Math.round(((totalAmount * prepayPct) / 100) * 100) / 100;
  const balanceAmount = Math.round((totalAmount - prepayAmount) * 100) / 100;

  // Дата першого платежу
  const firstDue =
    dueDate ??
    (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d;
    })();

  // Дата балансового платежу: за 3 дні до заїзду, або через 7 днів від першого
  const balanceDue = checkInDate
    ? (() => {
        const d = new Date(checkInDate);
        d.setDate(d.getDate() - 3);
        // Якщо виходить раніше від prepay → +7 днів від prepay
        return d > firstDue ? d : new Date(firstDue.getTime() + 7 * 24 * 60 * 60 * 1000);
      })()
    : new Date(firstDue.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Перший внесок
  await tx.paymentScheduleLine.create({
    data: {
      bookingId,
      sequence: 1,
      label: `Перший внесок ${prepayPct}%`,
      pct: prepayPct,
      amount: prepayAmount,
      dueDate: firstDue,
      status: 'pending'
    }
  });

  // Баланс (тільки якщо є сума)
  if (balanceAmount > 0) {
    await tx.paymentScheduleLine.create({
      data: {
        bookingId,
        sequence: 2,
        label: `Залишок ${100 - prepayPct}%`,
        pct: 100 - prepayPct,
        amount: balanceAmount,
        dueDate: balanceDue,
        status: 'pending'
      }
    });
  }
}
