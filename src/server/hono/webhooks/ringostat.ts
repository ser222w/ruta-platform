import { Hono } from 'hono';
import type { Context } from 'hono';
import { db } from '@/server/db';
import { pushToUser } from '@/server/events';
import type { IncomingCallPayload, CallEndedPayload } from '@/server/events';

const ringostatWebhook = new Hono();

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

// Ringostat webhook payload (реальні поля згідно документації)
interface RingostatPayload {
  // Номери
  caller?: string; // хто телефонує
  callee?: string; // куди телефонують (dst)
  dst?: string; // альтернативне поле для callee

  // ID дзвінка
  call_id?: string; // uniqueid в Ringostat
  uniqueid?: string; // альтернативне поле

  // Статус і тип
  call_type?: string; // 'in' | 'out' | 'callback'
  disposition?: string; // ANSWERED | NO ANSWER | BUSY | FAILED

  // Тривалість
  billsec?: number | string; // тривалість розмови в секундах
  call_duration?: number | string; // загальна тривалість
  waittime?: number | string; // час очікування

  // Менеджер
  manager_id?: string;
  employee_fio?: string; // ПІБ менеджера
  department?: string;

  // Запис
  has_recording?: number | string; // 1 або 0
  recording?: string; // URL запису
  recording_wav?: string; // URL WAV запису
  record?: string; // ID запису

  // UTM
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;

  // Додатково
  pool_name?: string;
  proper_flag?: number | string; // 1 = цільовий
  repeated_flag?: number | string; // 1 = повторний
  landing?: string;
  refferrer?: string; // Ringostat пише з подвійним f
  client_id?: string; // visitor UUID
  call_card?: string; // URL картки дзвінка
  project_id?: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function normalizePhone(phone: string | undefined): string | null {
  if (!phone) return null;
  // Видаляємо всі нецифрові символи крім +
  const clean = phone.replace(/[^\d+]/g, '');
  if (!clean) return null;
  // Якщо починається з 380 або +380 — залишаємо
  if (clean.startsWith('+380')) return clean;
  if (clean.startsWith('380')) return `+${clean}`;
  // Якщо 10 цифр (український формат без коду) — додаємо +38
  if (/^\d{10}$/.test(clean)) return `+38${clean}`;
  return clean;
}

function toInt(val: number | string | undefined): number | null {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function toBool(val: number | string | undefined): boolean | null {
  if (val === undefined || val === null || val === '') return null;
  return Number(val) === 1;
}

function verifyAuthKey(authKey: string | undefined): boolean {
  const expected = process.env.RINGOSTAT_AUTH_KEY;
  if (!expected) return true; // якщо не налаштовано — пропускаємо (dev mode)
  return authKey === expected;
}

// ─────────────────────────────────────────────
// POST /api/webhooks/ringostat?event=call_start|call_end|missed
// ─────────────────────────────────────────────

ringostatWebhook.post('/', async (c) => {
  // Auth — Ringostat передає Auth-Key в заголовку
  const authKey = c.req.header('Auth-Key') ?? c.req.header('auth-key');
  if (!verifyAuthKey(authKey)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Event type з query param (static param в Ringostat UI)
  const eventType = c.req.query('event') ?? 'call_start';

  // Парсимо payload
  let payload: RingostatPayload;
  try {
    const contentType = c.req.header('content-type') ?? '';
    if (contentType.includes('application/json')) {
      payload = await c.req.json<RingostatPayload>();
    } else {
      // Form-encoded
      const form = await c.req.formData();
      payload = Object.fromEntries(form.entries()) as unknown as RingostatPayload;
    }
  } catch {
    return c.json({ error: 'Invalid payload' }, 400);
  }

  // Нормалізуємо поля
  const externalId = payload.call_id ?? payload.uniqueid;
  const callerPhone = normalizePhone(payload.caller);
  const calleePhone = normalizePhone(payload.callee ?? payload.dst);
  const isIncoming = !payload.call_type || payload.call_type === 'in';

  if (!externalId) {
    return c.json({ error: 'Missing call_id' }, 400);
  }

  // ── call_start (incoming) ──────────────────
  if (eventType === 'call_start' && isIncoming) {
    return handleCallStart(c, externalId, callerPhone, calleePhone, payload);
  }

  // ── call_end ──────────────────────────────
  if (eventType === 'call_end') {
    return handleCallEnd(c, externalId, payload);
  }

  // ── missed ────────────────────────────────
  if (eventType === 'missed') {
    return handleMissed(c, externalId, callerPhone, calleePhone, payload);
  }

  // Інші події — ігноруємо з 200
  return c.json({ status: 'ignored', event: eventType }, 200);
});

// ─────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────

async function handleCallStart(
  c: Context,
  externalId: string,
  callerPhone: string | null,
  calleePhone: string | null,
  payload: RingostatPayload
) {
  // Idempotency: якщо вже є — повертаємо OK
  const existing = await db.phoneCall.findUnique({
    where: { externalId },
    select: { id: true, inquiryId: true }
  });
  if (existing) {
    return c.json({ status: 'duplicate', callId: existing.id }, 200);
  }

  // Шукаємо гостя за номером телефону
  const guest = callerPhone
    ? await db.guestProfile.findFirst({
        where: { OR: [{ phone: callerPhone }, { phone2: callerPhone }] },
        select: { id: true, name: true, loyaltyTier: true }
      })
    : null;

  // Бронювання гостя (окремим запитом — GuestProfile не має прямого relation)
  const guestBookings = guest
    ? await db.booking.findMany({
        where: { guestId: guest.id, stage: 'CHECKOUT' },
        select: {
          id: true,
          grandTotal: true,
          checkoutDate: true,
          property: { select: { name: true } }
        },
        orderBy: { checkoutDate: 'desc' },
        take: 10
      })
    : [];

  // Шукаємо менеджера за manager_id (email або ringostat ID)
  const manager = payload.manager_id
    ? await db.user.findFirst({
        where: {
          OR: [{ email: payload.manager_id }, { name: payload.employee_fio ?? '' }]
        },
        select: { id: true, name: true }
      })
    : null;

  // Розраховуємо LTV
  const ltv = guestBookings.reduce((sum, b) => sum + Number(b.grandTotal ?? 0), 0);
  const stayCount = guestBookings.length;
  const lastBooking = guestBookings[0];

  // Транзакція: PhoneCall + Inquiry
  const result = await db.$transaction(async (tx) => {
    // Створюємо PhoneCall
    const call = await tx.phoneCall.create({
      data: {
        externalId,
        direction: 'INCOMING',
        status: 'ACTIVE',
        callerPhone,
        calleePhone,
        managerId: manager?.id,
        managerEmail: payload.manager_id,
        employeeName: payload.employee_fio,
        hasRecording: false,
        utmSource: payload.utm_source,
        utmMedium: payload.utm_medium,
        utmCampaign: payload.utm_campaign,
        utmContent: payload.utm_content,
        utmTerm: payload.utm_term,
        poolName: payload.pool_name,
        isProper: toBool(payload.proper_flag),
        isRepeated: toBool(payload.repeated_flag),
        landingPage: payload.landing,
        referrer: payload.refferrer,
        clientUuid: payload.client_id,
        callCardUrl: payload.call_card,
        projectId: payload.project_id
      }
    });

    // Створюємо Inquiry
    const inquiry = await tx.inquiry.create({
      data: {
        source: 'PHONE',
        status: 'NEW',
        externalId: `ringostat:${externalId}`,
        guestId: guest?.id,
        assignedToId: manager?.id,
        contactPhone: callerPhone,
        contactName: guest?.name
        // UTM зберігається в PhoneCall, не в Inquiry
      }
    });

    // Лінкуємо PhoneCall → Inquiry
    await tx.phoneCall.update({
      where: { id: call.id },
      data: { inquiryId: inquiry.id }
    });

    return { call, inquiry };
  });

  // SSE push до менеджера
  if (manager?.id) {
    const ssePayload: IncomingCallPayload = {
      callId: result.call.id,
      callerPhone: callerPhone ?? '',
      callerName: guest?.name,
      guestId: guest?.id,
      guestLtv: ltv,
      guestStayCount: stayCount,
      guestLastProperty: lastBooking?.property?.name,
      guestLastStay: lastBooking?.checkoutDate?.toISOString(),
      inquiryId: result.inquiry.id,
      managerId: manager.id
    };
    pushToUser(manager.id, { type: 'INCOMING_CALL', payload: ssePayload });
  }

  return c.json({ status: 'created', callId: result.call.id, inquiryId: result.inquiry.id }, 200);
}

async function handleCallEnd(c: Context, externalId: string, payload: RingostatPayload) {
  const call = await db.phoneCall.findUnique({
    where: { externalId },
    select: { id: true, inquiryId: true, managerId: true }
  });

  if (!call) {
    // Дзвінок не знайдено — ігноруємо (міг бути outgoing або не оброблений)
    return c.json({ status: 'not_found' }, 200);
  }

  const duration = toInt(payload.billsec ?? payload.call_duration);
  const hasRecording = Number(payload.has_recording) === 1;
  const recordingUrl = payload.recording_wav ?? payload.recording;

  await db.$transaction(async (tx) => {
    // Оновлюємо PhoneCall
    await tx.phoneCall.update({
      where: { id: call.id },
      data: {
        status: duration && duration > 0 ? 'COMPLETED' : 'MISSED',
        duration,
        hasRecording,
        recordingUrl: recordingUrl ?? null,
        recordingId: payload.record,
        waitTime: toInt(payload.waittime)
      }
    });

    // Оновлюємо Inquiry
    if (call.inquiryId) {
      await tx.inquiry.update({
        where: { id: call.inquiryId },
        data: {
          status: duration && duration > 0 ? 'IN_PROGRESS' : 'NEW'
        }
      });
    }
  });

  // SSE push
  if (call.managerId) {
    const ssePayload: CallEndedPayload = {
      callId: call.id,
      externalId,
      duration: duration ?? 0,
      inquiryId: call.inquiryId ?? undefined
    };
    pushToUser(call.managerId, { type: 'CALL_ENDED', payload: ssePayload });
  }

  return c.json({ status: 'updated' }, 200);
}

async function handleMissed(
  c: Context,
  externalId: string,
  callerPhone: string | null,
  calleePhone: string | null,
  payload: RingostatPayload
) {
  // Idempotency
  const existing = await db.phoneCall.findUnique({
    where: { externalId },
    select: { id: true, inquiryId: true }
  });
  if (existing) {
    return c.json({ status: 'duplicate', callId: existing.id }, 200);
  }

  const guest = callerPhone
    ? await db.guestProfile.findFirst({
        where: { OR: [{ phone: callerPhone }, { phone2: callerPhone }] },
        select: { id: true, name: true }
      })
    : null;

  const manager = payload.manager_id
    ? await db.user.findFirst({
        where: { OR: [{ email: payload.manager_id }, { name: payload.employee_fio ?? '' }] },
        select: { id: true }
      })
    : null;

  const result = await db.$transaction(async (tx) => {
    const call = await tx.phoneCall.create({
      data: {
        externalId,
        direction: 'INCOMING',
        status: 'MISSED',
        callerPhone,
        calleePhone,
        managerId: manager?.id,
        managerEmail: payload.manager_id,
        employeeName: payload.employee_fio,
        utmSource: payload.utm_source,
        utmMedium: payload.utm_medium,
        utmCampaign: payload.utm_campaign,
        utmContent: payload.utm_content,
        utmTerm: payload.utm_term,
        poolName: payload.pool_name,
        isRepeated: toBool(payload.repeated_flag),
        landingPage: payload.landing,
        clientUuid: payload.client_id,
        projectId: payload.project_id
      }
    });

    const inquiry = await tx.inquiry.create({
      data: {
        source: 'PHONE',
        status: 'NEW',
        externalId: `ringostat:missed:${externalId}`,
        guestId: guest?.id,
        assignedToId: manager?.id,
        contactPhone: callerPhone,
        contactName: guest?.name,
        nextAction: 'Передзвонити — пропущений дзвінок'
      }
    });

    await tx.phoneCall.update({
      where: { id: call.id },
      data: { inquiryId: inquiry.id }
    });

    return { call, inquiry };
  });

  return c.json(
    { status: 'created_missed', callId: result.call.id, inquiryId: result.inquiry.id },
    200
  );
}

export default ringostatWebhook;
