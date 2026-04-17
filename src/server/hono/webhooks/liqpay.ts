import { Hono } from 'hono';
import { db } from '@/server/db';
import { verifyLiqPaySignature, decodeLiqPayData } from '@/server/services/liqpay';

const liqpayWebhook = new Hono();

/**
 * POST /api/webhooks/liqpay
 *
 * LiqPay надсилає: data (base64 JSON) + signature
 * Підпис: base64(sha1(privateKey + data + privateKey))
 *
 * При успішній оплаті:
 * 1. Верифікуємо підпис
 * 2. Ідемпотентно перевіряємо externalId
 * 3. Оновлюємо SaleOrder → PAID
 * 4. Booking.stage → PREPAYMENT, prepaidAt = now
 * 5. Auto-assign Farmer
 * 6. Create Activity: HANDOFF
 */
liqpayWebhook.post('/', async (c) => {
  let data: string;
  let signature: string;

  // LiqPay надсилає form-data або JSON
  const contentType = c.req.header('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = await c.req.json<{ data?: string; signature?: string }>();
    data = body.data ?? '';
    signature = body.signature ?? '';
  } else {
    const formData = await c.req.formData();
    data = (formData.get('data') as string) ?? '';
    signature = (formData.get('signature') as string) ?? '';
  }

  if (!data || !signature) {
    return c.json({ error: 'Missing data or signature' }, 400);
  }

  // Декодуємо payload для отримання order_id і propertyId
  let payload: Record<string, unknown>;
  try {
    payload = decodeLiqPayData(data);
  } catch {
    return c.json({ error: 'Invalid data encoding' }, 400);
  }

  const orderId = payload.order_id as string;
  const status = payload.status as string;

  // Знаходимо SaleOrder по order_id (ідемпотентність)
  const saleOrder = await db.saleOrder.findUnique({
    where: { liqpayOrderId: orderId },
    include: {
      booking: {
        select: { id: true, propertyId: true, stage: true, farmerId: true }
      }
    }
  });

  if (!saleOrder) {
    // Спробуємо знайти по paymentToken (якщо orderId = paymentToken)
    const byToken = await db.saleOrder.findUnique({
      where: { paymentToken: orderId },
      include: {
        booking: {
          select: { id: true, propertyId: true, stage: true, farmerId: true }
        }
      }
    });
    if (!byToken) {
      // Не наш order — 200 щоб LiqPay не ретраїв
      return c.json({ status: 'unknown_order' }, 200);
    }
  }

  const order =
    saleOrder ??
    (await db.saleOrder.findUnique({
      where: { paymentToken: orderId },
      include: { booking: { select: { id: true, propertyId: true, stage: true, farmerId: true } } }
    }))!;

  // Якщо вже оброблено — ідемпотентно повертаємо OK
  if (order.isPaid) {
    return c.json({ status: 'already_processed' }, 200);
  }

  // Верифікуємо підпис за liqpayPrivateKey готелю
  const property = await db.property.findUnique({
    where: { id: order.booking.propertyId },
    select: { liqpayPrivateKey: true }
  });

  const privateKey = property?.liqpayPrivateKey ?? process.env.LIQPAY_PRIVATE_KEY ?? '';

  if (!verifyLiqPaySignature(privateKey, data, signature)) {
    return c.json({ error: 'Invalid signature' }, 403);
  }

  // Обробляємо тільки статус success
  if (status !== 'success' && status !== 'sandbox') {
    return c.json({ status: 'ignored', liqpayStatus: status }, 200);
  }

  const amount = Number(payload.amount ?? 0);
  const bookingId = order.booking.id;

  await db.$transaction(async (tx) => {
    // Оновлюємо SaleOrder
    await tx.saleOrder.update({
      where: { id: order.id },
      data: {
        isPaid: true,
        state: 'PAID',
        paidAmount: amount,
        paidAt: new Date(),
        rawResponse: payload as object,
        liqpayOrderId: orderId
      }
    });

    // Оновлюємо Booking
    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: {
        stage: 'PREPAYMENT',
        prepaidAt: new Date(),
        paidAmount: { increment: amount },
        paymentStatus: 'partial'
      }
    });

    // Auto-assign Farmer: знаходимо першого вільного FARMER
    if (!updatedBooking.farmerId) {
      const farmer = await tx.user.findFirst({
        where: { role: 'FARMER' },
        orderBy: { createdAt: 'asc' },
        select: { id: true }
      });

      if (farmer) {
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            farmerId: farmer.id,
            farmerHandoffAt: new Date()
          }
        });

        // Activity: HANDOFF
        await tx.activity.create({
          data: {
            bookingId,
            userId: farmer.id,
            type: 'HANDOFF',
            title: 'Автоматична передача після передоплати',
            body: `Фармер призначений автоматично після отримання оплати ${amount} UAH`
          }
        });
      }
    }

    // Activity: PAYMENT_RECEIVED
    await tx.activity.create({
      data: {
        bookingId,
        type: 'PAYMENT_RECEIVED',
        title: `Отримано оплату ${amount} UAH`,
        body: `LiqPay order_id: ${orderId}`
      }
    });
  });

  return c.json({ status: 'processed' }, 200);
});

export default liqpayWebhook;
