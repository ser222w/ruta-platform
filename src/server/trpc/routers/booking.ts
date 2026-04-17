import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, authedProcedure } from '../trpc';
import { db } from '@/server/db';
import { BookingStage } from '@prisma/client';
import { calculateRate } from '@/server/services/pricing/calculate-rate';
import { generateSchedule } from '@/server/services/pricing/generate-schedule';
import { generatePortalToken } from '@/server/services/portal';

// ============================================================
// Схеми
// ============================================================

const bookingListSchema = z.object({
  propertyId: z.string().optional(),
  closerId: z.string().optional(),
  stage: z.nativeEnum(BookingStage).optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
});

const updateStageSchema = z.object({
  id: z.string(),
  stage: z.nativeEnum(BookingStage),
  lostReason: z.string().optional()
});

const calculatePriceSchema = z.object({
  propertyId: z.string(),
  tariffId: z.string(),
  roomCategoryId: z.string(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  adultsCount: z.number().int().min(1).default(2),
  guestSegment: z.enum(['NEW', 'FRIEND', 'FAMILY', 'VIP']).default('NEW'),
  certificateCode: z.string().optional(),
  managerDiscountPct: z.number().min(0).max(100).default(0)
});

const generatePaymentScheduleSchema = z.object({
  bookingId: z.string(),
  totalAmount: z.number(),
  prepayPct: z.number().int().min(0).max(100),
  dueDate: z.string().optional() // дата першого платежу
});

const generatePaymentLinkSchema = z.object({
  bookingId: z.string()
});

// ============================================================
// Router
// ============================================================

export const bookingRouter = router({
  // Список замовлень
  list: authedProcedure.input(bookingListSchema).query(async ({ ctx, input }) => {
    if (!ctx.ability.can('read', 'Booking')) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const { page, limit, propertyId, closerId, stage, search } = input;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (ctx.user.role === 'CLOSER') where.closerId = ctx.user.id;
    if (ctx.user.role === 'FARMER') where.farmerId = ctx.user.id;

    if (propertyId) where.propertyId = propertyId;
    if (closerId) where.closerId = closerId;
    if (stage) where.stage = stage;

    if (search) {
      where.OR = [
        { bookingNumber: { contains: search, mode: 'insensitive' } },
        { guest: { name: { contains: search, mode: 'insensitive' } } },
        { guest: { phone: { contains: search } } }
      ];
    }

    const [items, total] = await db.$transaction([
      db.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          bookingNumber: true,
          stage: true,
          type: true,
          checkinDate: true,
          checkoutDate: true,
          nightsCount: true,
          adultsCount: true,
          grandTotal: true,
          paidAmount: true,
          paymentStatus: true,
          portalToken: true,
          createdAt: true,
          property: { select: { id: true, name: true, slug: true } },
          guest: { select: { id: true, name: true, phone: true, loyaltyTier: true } },
          closer: { select: { id: true, name: true } },
          farmer: { select: { id: true, name: true } }
        }
      }),
      db.booking.count({ where })
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }),

  // Деталі замовлення
  getById: authedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const booking = await db.booking.findUnique({
      where: { id: input.id },
      include: {
        property: { select: { id: true, name: true, slug: true, liqpayPublicKey: true } },
        guest: {
          include: { tags: { include: { tag: true } } }
        },
        closer: { select: { id: true, name: true, email: true } },
        farmer: { select: { id: true, name: true, email: true } },
        tariff: { select: { id: true, name: true, mealPlan: true } },
        roomLines: {
          include: { roomCategory: { select: { id: true, name: true } } }
        },
        guestLines: true,
        paymentLines: { orderBy: { sequence: 'asc' } },
        saleOrders: { orderBy: { createdAt: 'desc' } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { user: { select: { id: true, name: true } } }
        },
        tasks: {
          orderBy: { dueAt: 'asc' },
          include: { assignedTo: { select: { id: true, name: true } } }
        },
        inquiry: { select: { id: true, source: true, contactNote: true } }
      }
    });

    if (!booking) throw new TRPCError({ code: 'NOT_FOUND' });

    return booking;
  }),

  // Оновити стадію (з audit trail)
  updateStage: authedProcedure.input(updateStageSchema).mutation(async ({ ctx, input }) => {
    const booking = await db.booking.findUnique({
      where: { id: input.id },
      select: { id: true, stage: true, closerId: true, farmerId: true }
    });

    if (!booking) throw new TRPCError({ code: 'NOT_FOUND' });
    if (!ctx.ability.can('update', 'Booking')) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const now = new Date();
    const stageTimestamps: Record<string, Date> = {};

    if (input.stage === 'INVOICE') stageTimestamps.invoicedAt = now;
    if (input.stage === 'PREPAYMENT') stageTimestamps.prepaidAt = now;
    if (input.stage === 'CHECKIN') stageTimestamps.checkedInAt = now;
    if (input.stage === 'CHECKOUT') stageTimestamps.checkedOutAt = now;

    return db.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: input.id },
        data: {
          stage: input.stage,
          lostReason: input.lostReason,
          isWon: input.stage === 'CHECKOUT',
          ...stageTimestamps
        }
      });

      // Audit activity
      await tx.activity.create({
        data: {
          bookingId: input.id,
          userId: ctx.user.id,
          type: 'STAGE_CHANGE',
          title: `Стадія змінена: ${booking.stage} → ${input.stage}`,
          body: input.lostReason ? `Причина відмови: ${input.lostReason}` : undefined
        }
      });

      return updated;
    });
  }),

  // Розрахувати ціну бронювання
  calculatePrice: authedProcedure.input(calculatePriceSchema).query(async ({ ctx, input }) => {
    if (!ctx.ability.can('read', 'Booking')) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const result = await calculateRate({
      propertyId: input.propertyId,
      tariffId: input.tariffId,
      roomCategoryId: input.roomCategoryId,
      checkInDate: new Date(input.checkInDate),
      checkOutDate: new Date(input.checkOutDate),
      adultsCount: input.adultsCount,
      guestSegment: input.guestSegment,
      certificateCode: input.certificateCode,
      managerDiscountPct: input.managerDiscountPct
    });

    return result;
  }),

  // Згенерувати графік оплат
  generatePaymentSchedule: authedProcedure
    .input(generatePaymentScheduleSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.ability.can('update', 'Booking')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const booking = await db.booking.findUnique({
        where: { id: input.bookingId },
        select: {
          id: true,
          checkinDate: true,
          grandTotal: true,
          guest: { select: { loyaltyTier: true } }
        }
      });

      if (!booking) throw new TRPCError({ code: 'NOT_FOUND' });

      // Видаляємо старий графік і створюємо новий
      await db.$transaction(async (tx) => {
        await tx.paymentScheduleLine.deleteMany({ where: { bookingId: input.bookingId } });

        await generateSchedule({
          tx,
          bookingId: input.bookingId,
          totalAmount: input.totalAmount,
          prepayPct: input.prepayPct,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          checkInDate: booking.checkinDate ?? undefined
        });
      });

      return db.paymentScheduleLine.findMany({
        where: { bookingId: input.bookingId },
        orderBy: { sequence: 'asc' }
      });
    }),

  // Згенерувати посилання на оплату (portal token)
  generatePaymentLink: authedProcedure
    .input(generatePaymentLinkSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.ability.can('update', 'Booking')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const booking = await db.booking.findUnique({
        where: { id: input.bookingId },
        select: { id: true, grandTotal: true, stage: true }
      });

      if (!booking) throw new TRPCError({ code: 'NOT_FOUND' });

      const { token, expiresAt } = await generatePortalToken(input.bookingId);

      // Логуємо активність
      await db.activity.create({
        data: {
          bookingId: input.bookingId,
          userId: ctx.user.id,
          type: 'PAYMENT_LINK_SENT',
          title: 'Посилання на оплату згенеровано'
        }
      });

      const portalUrl = `${process.env.BETTER_AUTH_URL ?? 'https://app.ruta.cam'}/portal/booking/${token}`;

      return { token, expiresAt, url: portalUrl };
    })
});
