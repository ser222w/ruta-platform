import { db } from '@/server/db';

interface ApplyCertificateInput {
  code: string;
  finalTotal: number; // сума після знижок
}

interface CertificateResult {
  id: string;
  code: string;
  initialAmount: number;
  usedAmount: number;
  remainingAmount: number;
  appliedAmount: number; // скільки використовуємо в цій транзакції
  newPaymentDue: number; // finalTotal - appliedAmount (min 0)
}

/**
 * Логіка сертифіката (з CLAUDE.md):
 * - certificate > final_total → використовуємо final_total, залишок активний
 * - certificate <= final_total → використовуємо повністю
 * - payment_due = max(0, final_total - cert_amount)
 */
export async function applyCertificate(input: ApplyCertificateInput): Promise<CertificateResult> {
  const { code, finalTotal } = input;

  const cert = await db.certificate.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      initialAmount: true,
      usedAmount: true,
      state: true,
      expiresAt: true
    }
  });

  if (!cert) {
    throw new Error(`Сертифікат ${code} не знайдено`);
  }

  if (cert.state !== 'ACTIVE') {
    throw new Error(`Сертифікат ${code} не активний (статус: ${cert.state})`);
  }

  if (cert.expiresAt && cert.expiresAt < new Date()) {
    throw new Error(`Сертифікат ${code} прострочений`);
  }

  const initialAmount = Number(cert.initialAmount);
  const usedAmount = Number(cert.usedAmount);
  const remainingAmount = initialAmount - usedAmount;

  if (remainingAmount <= 0) {
    throw new Error(`Сертифікат ${code} вже повністю використано`);
  }

  // Скільки застосовуємо: min(залишок, сума до сплати)
  const appliedAmount = Math.min(remainingAmount, finalTotal);
  const newPaymentDue = Math.max(0, finalTotal - appliedAmount);

  return {
    id: cert.id,
    code: cert.code,
    initialAmount,
    usedAmount,
    remainingAmount,
    appliedAmount,
    newPaymentDue
  };
}
