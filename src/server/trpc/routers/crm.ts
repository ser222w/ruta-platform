import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, authedProcedure } from '../trpc';
import { db } from '@/server/db';
import { BookingStage } from '@prisma/client';

// ============================================================
// Валідація
// ============================================================

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
});

const filterSchema = z.object({
  propertyId: z.string().optional(),
  closerId: z.string().optional(),
  stage: z.nativeEnum(BookingStage).optional(),
  search: z.string().optional(), // пошук по імені гостя або номеру бронювання
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
});

// ============================================================
// Хелпери
// ============================================================

// Базові відносини для включення в запити (не вкладені)
const bookingSelect = {
  id: true,
  bookingNumber: true,
  stage: true,
  type: true,
  checkinDate: true,
  checkoutDate: true,
  nightsCount: true,
  adultsCount: true,
  childrenCount: true,
  grandTotal: true,
  paidAmount: true,
  paymentStatus: true,
  notes: true,
  lostReason: true,
  utmSource: true,
  utmMedium: true,
  utmCampaign: true,
  createdAt: true,
  updatedAt: true,
  property: { select: { id: true, name: true, slug: true } },
  guest: { select: { id: true, name: true, phone: true, email: true, loyaltyTier: true } },
  closer: { select: { id: true, name: true, email: true } },
  farmer: { select: { id: true, name: true, email: true } },
  roomLines: {
    select: {
      id: true,
      roomsCount: true,
      nightsCount: true,
      pricePerNight: true,
      total: true,
      roomCategory: { select: { id: true, name: true } }
    }
  }
} as const;

// ============================================================
// Router
// ============================================================

export const crmRouter = router({
  // Дані для kanban — згруповані по стадіях
  pipeline: authedProcedure.input(filterSchema).query(async ({ ctx, input }) => {
    if (!ctx.ability.can('read', 'Booking')) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const where = buildWhere(input, ctx.user.id, ctx.user.role);

    const bookings = await db.booking.findMany({
      where,
      select: bookingSelect,
      orderBy: { updatedAt: 'desc' }
    });

    // Групуємо по стадіях
    const grouped = Object.values(BookingStage).reduce(
      (acc, stage) => {
        acc[stage] = bookings.filter((b) => b.stage === stage);
        return acc;
      },
      {} as Record<BookingStage, typeof bookings>
    );

    return { grouped, total: bookings.length };
  }),

  // Пагінований список для table view
  list: authedProcedure
    .input(filterSchema.merge(paginationSchema))
    .query(async ({ ctx, input }) => {
      if (!ctx.ability.can('read', 'Booking')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const { page, limit, ...filters } = input;
      const where = buildWhere(filters, ctx.user.id, ctx.user.role);

      const [items, total] = await Promise.all([
        db.booking.findMany({
          where,
          select: bookingSelect,
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        db.booking.count({ where })
      ]);

      return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    }),

  // Деталі бронювання з повною інформацією
  getById: authedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    if (!ctx.ability.can('read', 'Booking')) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const booking = await db.booking.findUnique({
      where: { id: input.id },
      select: {
        ...bookingSelect,
        mealPlan: true,
        prepayPct: true,
        prepayAmount: true,
        roomsTotal: true,
        servicesTotal: true,
        discountTotal: true,
        portalToken: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            type: true,
            title: true,
            body: true,
            createdAt: true,
            doneAt: true,
            user: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!booking) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    return booking;
  }),

  // Зміна стадії + audit trail
  updateStage: authedProcedure
    .input(
      z.object({
        id: z.string(),
        stage: z.nativeEnum(BookingStage),
        lostReason: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const booking = await db.booking.findUnique({
        where: { id: input.id },
        select: { id: true, stage: true, closerId: true }
      });

      if (!booking) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // CASL перевірка: чи може цей юзер оновлювати цей booking
      if (
        !ctx.ability.can('update', { __caslSubjectType__: 'Booking', closerId: booking.closerId })
      ) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const prevStage = booking.stage;

      const updated = await db.booking.update({
        where: { id: input.id },
        data: {
          stage: input.stage,
          isWon: input.stage === 'CHECKOUT',
          lostReason: input.stage === 'LOST' ? input.lostReason : undefined,
          // Авто-апдейт дати виїзду якщо CHECKOUT
          activities: {
            create: {
              type: 'stage_change',
              title: `Стадія змінена: ${prevStage} → ${input.stage}`,
              body: input.lostReason ? `Причина: ${input.lostReason}` : undefined,
              userId: ctx.user.id,
              doneAt: new Date()
            }
          }
        },
        select: bookingSelect
      });

      return updated;
    }),

  // Призначення менеджера
  assignManager: authedProcedure
    .input(
      z.object({
        id: z.string(),
        closerId: z.string().optional(),
        farmerId: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.ability.can('update', 'Booking')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const updated = await db.booking.update({
        where: { id: input.id },
        data: {
          ...(input.closerId !== undefined && { closerId: input.closerId }),
          ...(input.farmerId !== undefined && { farmerId: input.farmerId }),
          activities: {
            create: {
              type: 'assignment',
              title: 'Змінено відповідального менеджера',
              userId: ctx.user.id,
              doneAt: new Date()
            }
          }
        },
        select: bookingSelect
      });

      return updated;
    }),

  // Додавання нотатки
  addNote: authedProcedure
    .input(
      z.object({
        id: z.string(),
        body: z.string().min(1).max(2000)
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.ability.can('read', 'Booking')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const activity = await db.activity.create({
        data: {
          bookingId: input.id,
          type: 'note',
          title: 'Нотатка',
          body: input.body,
          userId: ctx.user.id,
          doneAt: new Date()
        },
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          createdAt: true,
          user: { select: { id: true, name: true } }
        }
      });

      return activity;
    })
});

// ============================================================
// Хелпер: WHERE-умова з урахуванням ролі
// ============================================================

function buildWhere(filters: z.infer<typeof filterSchema>, userId: string, role: string) {
  const where: Record<string, unknown> = {};

  // Closer бачить тільки свої ліди
  if (role === 'CLOSER') {
    where.closerId = userId;
  }

  // Farmer бачить тільки свої бронювання на PREPAYMENT+
  if (role === 'FARMER') {
    where.farmerId = userId;
    where.stage = {
      in: ['PREPAYMENT', 'DEVELOPMENT', 'CHECKIN', 'CHECKOUT']
    };
  }

  // Housekeeper бачить тільки CHECKIN/CHECKOUT
  if (role === 'HOUSEKEEPER') {
    where.stage = { in: ['CHECKIN', 'CHECKOUT'] };
  }

  if (filters.propertyId) where.propertyId = filters.propertyId;
  if (filters.closerId && role !== 'CLOSER') where.closerId = filters.closerId;
  if (filters.stage) where.stage = filters.stage;

  if (filters.search) {
    where.OR = [
      { bookingNumber: { contains: filters.search, mode: 'insensitive' } },
      { guest: { name: { contains: filters.search, mode: 'insensitive' } } },
      { guest: { phone: { contains: filters.search } } }
    ];
  }

  if (filters.dateFrom || filters.dateTo) {
    where.checkinDate = {
      ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
      ...(filters.dateTo && { lte: new Date(filters.dateTo) })
    };
  }

  return where;
}
