import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, authedProcedure } from '../trpc';
import { db } from '@/server/db';
import { InquiryStatus, InquirySource } from '@prisma/client';

// ============================================================
// Схеми
// ============================================================

const createInquirySchema = z.object({
  source: z.nativeEnum(InquirySource).default('MANUAL'),
  propertyId: z.string().optional(),
  guestId: z.string().optional(),
  contactPhone: z.string().optional(),
  contactName: z.string().optional(),
  contactNote: z.string().optional(),
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),
  adultsCount: z.number().int().min(1).max(20).default(2),
  nextAction: z.string().optional()
});

const listInquirySchema = z.object({
  status: z.nativeEnum(InquiryStatus).optional(),
  propertyId: z.string().optional(),
  assignedToId: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
});

const updateStatusSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(InquiryStatus),
  nextAction: z.string().optional(),
  nextActionAt: z.string().datetime().optional()
});

const convertToBookingSchema = z.object({
  inquiryId: z.string(),
  propertyId: z.string(),
  tariffId: z.string().optional(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  adultsCount: z.number().int().min(1).default(2),
  childrenCount: z.number().int().min(0).default(0),
  guestId: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional()
});

// ============================================================
// Helpers
// ============================================================

function generateBookingNumber(prefix: string): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  // NNN — буде вирішено через sequence при реальному insert
  const nnn = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `${prefix}${yy}${mm}${dd}${nnn}`;
}

// ============================================================
// Router
// ============================================================

export const inquiryRouter = router({
  // Список звернень з фільтрами
  list: authedProcedure.input(listInquirySchema).query(async ({ ctx, input }) => {
    if (!ctx.ability.can('read', 'Booking')) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const { page, limit, status, propertyId, assignedToId, search } = input;
    const skip = (page - 1) * limit;

    const andClauses: Record<string, unknown>[] = [];

    // CLOSER бачить свої звернення + всі незакріплені (unassigned)
    if (ctx.user.role === 'CLOSER') {
      andClauses.push({
        OR: [{ assignedToId: ctx.user.id }, { assignedToId: null }]
      });
    }

    if (status) andClauses.push({ status });
    if (propertyId) andClauses.push({ propertyId });
    if (assignedToId) andClauses.push({ assignedToId });

    if (search) {
      andClauses.push({
        OR: [
          { contactName: { contains: search, mode: 'insensitive' } },
          { contactPhone: { contains: search } },
          { guest: { name: { contains: search, mode: 'insensitive' } } },
          { guest: { phone: { contains: search } } }
        ]
      });
    }

    const where = andClauses.length > 0 ? { AND: andClauses } : {};

    const [items, total] = await db.$transaction([
      db.inquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          guest: { select: { id: true, name: true, phone: true, loyaltyTier: true } },
          assignedTo: { select: { id: true, name: true } },
          property: { select: { id: true, name: true, slug: true } },
          booking: { select: { id: true, bookingNumber: true, stage: true } },
          tasks: {
            where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
            orderBy: { dueAt: 'asc' },
            take: 1
          }
        }
      }),
      db.inquiry.count({ where })
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }),

  // Деталі одного звернення
  getById: authedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const inquiry = await db.inquiry.findUnique({
      where: { id: input.id },
      include: {
        guest: {
          include: {
            tags: { include: { tag: true } }
          }
        },
        assignedTo: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, name: true, slug: true } },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            stage: true,
            grandTotal: true,
            checkinDate: true,
            checkoutDate: true
          }
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignedTo: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!inquiry) throw new TRPCError({ code: 'NOT_FOUND' });

    // CLOSER може бачити тільки своє
    if (ctx.user.role === 'CLOSER' && inquiry.assignedToId !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    return inquiry;
  }),

  // Створити звернення вручну
  create: authedProcedure.input(createInquirySchema).mutation(async ({ ctx, input }) => {
    if (!ctx.ability.can('create', 'Booking')) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    // Пошук гостя за телефоном якщо є
    let guestId = input.guestId;
    if (!guestId && input.contactPhone) {
      const existing = await db.guestProfile.findUnique({
        where: { phone: input.contactPhone },
        select: { id: true }
      });
      if (existing) guestId = existing.id;
    }

    const inquiry = await db.inquiry.create({
      data: {
        source: input.source,
        propertyId: input.propertyId,
        guestId,
        assignedToId: ctx.user.id,
        contactPhone: input.contactPhone,
        contactName: input.contactName,
        contactNote: input.contactNote,
        checkInDate: input.checkInDate ? new Date(input.checkInDate) : null,
        checkOutDate: input.checkOutDate ? new Date(input.checkOutDate) : null,
        adultsCount: input.adultsCount,
        nextAction: input.nextAction
      },
      include: {
        guest: { select: { id: true, name: true, phone: true } },
        property: { select: { id: true, name: true } }
      }
    });

    return inquiry;
  }),

  // Оновити статус + nextAction
  updateStatus: authedProcedure.input(updateStatusSchema).mutation(async ({ ctx, input }) => {
    const inquiry = await db.inquiry.findUnique({
      where: { id: input.id },
      select: { id: true, assignedToId: true }
    });

    if (!inquiry) throw new TRPCError({ code: 'NOT_FOUND' });
    if (ctx.user.role === 'CLOSER' && inquiry.assignedToId !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    return db.inquiry.update({
      where: { id: input.id },
      data: {
        status: input.status,
        nextAction: input.nextAction,
        nextActionAt: input.nextActionAt ? new Date(input.nextActionAt) : undefined
      }
    });
  }),

  // Конвертувати Inquiry → Booking
  convertToBooking: authedProcedure
    .input(convertToBookingSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.ability.can('create', 'Booking')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const inquiry = await db.inquiry.findUnique({
        where: { id: input.inquiryId },
        include: { guest: true }
      });

      if (!inquiry) throw new TRPCError({ code: 'NOT_FOUND' });
      if (inquiry.status === 'CONVERTED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Звернення вже конвертовано' });
      }

      // Отримуємо префікс готелю для номеру
      const property = await db.property.findUnique({
        where: { id: input.propertyId },
        select: { bookingPrefix: true }
      });
      const prefix = property?.bookingPrefix ?? 'P';

      // Розраховуємо кількість ночей
      const checkIn = new Date(input.checkInDate);
      const checkOut = new Date(input.checkOutDate);
      const nightsCount = Math.round(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Знаходимо або створюємо гостя
      let guestId = input.guestId ?? inquiry.guestId;
      if (!guestId && input.contactPhone) {
        const existingGuest = await db.guestProfile.findUnique({
          where: { phone: input.contactPhone },
          select: { id: true }
        });
        if (existingGuest) {
          guestId = existingGuest.id;
        } else if (input.contactName) {
          const newGuest = await db.guestProfile.create({
            data: {
              name: input.contactName,
              phone: input.contactPhone
            }
          });
          guestId = newGuest.id;
        }
      }

      const result = await db.$transaction(async (tx) => {
        // Генеруємо унікальний номер
        let bookingNumber: string;
        let attempts = 0;
        do {
          bookingNumber = generateBookingNumber(prefix);
          const existing = await tx.booking.findUnique({
            where: { bookingNumber },
            select: { id: true }
          });
          if (!existing) break;
          attempts++;
          if (attempts > 10)
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Не вдалося згенерувати номер'
            });
        } while (attempts <= 10);

        // Створюємо Booking
        const booking = await tx.booking.create({
          data: {
            bookingNumber,
            propertyId: input.propertyId,
            guestId,
            closerId: ctx.user.id,
            tariffId: input.tariffId,
            checkinDate: checkIn,
            checkoutDate: checkOut,
            nightsCount,
            adultsCount: input.adultsCount,
            childrenCount: input.childrenCount
          }
        });

        // Оновлюємо Inquiry → CONVERTED
        await tx.inquiry.update({
          where: { id: input.inquiryId },
          data: {
            status: 'CONVERTED',
            bookingId: booking.id,
            convertedAt: new Date()
          }
        });

        return booking;
      });

      return result;
    })
});
