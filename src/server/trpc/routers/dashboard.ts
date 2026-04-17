import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, authedProcedure } from '../trpc';
import { db } from '@/server/db';
import { startOfMonth, endOfMonth, subMonths, format, differenceInDays } from 'date-fns';

// Стадії що вважаються "активними" бронюваннями
const ACTIVE_STAGES = [
  'QUALIFY',
  'PROPOSAL_1',
  'PROPOSAL_2',
  'PROPOSAL_3',
  'PROPOSAL_4',
  'INVOICE',
  'PREPAYMENT',
  'DEVELOPMENT',
  'CHECKIN'
] as const;

// Стадії для конверсійної воронки (в порядку)
const FUNNEL_STAGES = [
  { key: 'QUALIFY', label: 'Звернення' },
  { key: 'PROPOSAL_1', label: 'Пропозиція' },
  { key: 'PREPAYMENT', label: 'Передоплата' },
  { key: 'CHECKIN', label: 'Заїзд' }
] as const;

// Ролі що мають доступ до planning
const PLANNING_ROLES = ['ADMIN', 'DIRECTOR', 'REVENUE_MANAGER'] as const;

export const dashboardRouter = router({
  // ─── Planning KPIs (поточний місяць) ─────────────────────────────
  planningKpis: authedProcedure.query(async ({ ctx }) => {
    if (!PLANNING_ROLES.includes(ctx.user.role as (typeof PLANNING_ROLES)[number])) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const monthRange = { gte: monthStart, lte: monthEnd };

    // Revenue + nights booked
    const [revenueResult, bookedNightsResult, allBookings] = await db.$transaction([
      db.paymentScheduleLine.aggregate({
        where: { status: 'paid', paidAt: monthRange },
        _sum: { amount: true }
      }),
      db.booking.aggregate({
        where: {
          stage: { in: ['CHECKIN', 'CHECKOUT'] },
          checkinDate: { gte: monthStart }
        },
        _sum: { nightsCount: true }
      }),
      db.booking.findMany({
        where: {
          stage: { in: ['CHECKIN', 'CHECKOUT'] },
          checkinDate: { gte: monthStart, lte: monthEnd }
        },
        select: { checkinDate: true, checkoutDate: true, nightsCount: true }
      })
    ]);

    const revenue = Number(revenueResult._sum.amount ?? 0);
    const roomNightsSold = bookedNightsResult._sum.nightsCount ?? 0;

    // ADR = Revenue / room_nights_sold
    const adr = roomNightsSold > 0 ? revenue / roomNightsSold : 0;

    // ALOS — середня тривалість перебування
    let alos = 0;
    if (allBookings.length > 0) {
      const totalNights = allBookings.reduce((sum, b) => {
        if (b.checkinDate && b.checkoutDate) {
          return (
            sum + Math.max(0, differenceInDays(new Date(b.checkoutDate), new Date(b.checkinDate)))
          );
        }
        return sum + (b.nightsCount ?? 0);
      }, 0);
      alos = totalNights / allBookings.length;
    }

    // Occupancy — приблизно: room_nights_sold / (totalRooms * daysInMonth) * 100
    const totalRoomsResult = await db.property.aggregate({ _sum: { totalRooms: true } });
    const totalRooms = totalRoomsResult._sum.totalRooms ?? 0;
    const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
    const availableNights = totalRooms * daysInMonth;
    const occupancy = availableNights > 0 ? (roomNightsSold / availableNights) * 100 : 0;

    // RevPAR = Revenue / available_nights
    const revpar = availableNights > 0 ? revenue / availableNights : 0;

    return { revenue, adr, revpar, occupancy, alos, roomNightsSold, availableNights };
  }),

  // ─── Revenue trend (12 місяців) ──────────────────────────────────
  revenueTrend: authedProcedure.query(async ({ ctx }) => {
    if (!PLANNING_ROLES.includes(ctx.user.role as (typeof PLANNING_ROLES)[number])) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const months = Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(new Date(), 11 - i);
      return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, 'MMM yy') };
    });

    const results = await Promise.all(
      months.map(async ({ start, end, label }) => {
        const result = await db.paymentScheduleLine.aggregate({
          where: { status: 'paid', paidAt: { gte: start, lte: end } },
          _sum: { amount: true }
        });
        return { month: label, Revenue: Number(result._sum.amount ?? 0) };
      })
    );

    return results;
  }),

  // ─── Channel mix (поточний місяць) ───────────────────────────────
  channelMix: authedProcedure.query(async ({ ctx }) => {
    if (!PLANNING_ROLES.includes(ctx.user.role as (typeof PLANNING_ROLES)[number])) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const now = new Date();
    const monthRange = { gte: startOfMonth(now), lte: endOfMonth(now) };

    const bookings = await db.booking.findMany({
      where: { createdAt: monthRange },
      select: { utmSource: true }
    });

    const counts: Record<string, number> = {};
    for (const b of bookings) {
      const channel = b.utmSource ?? 'Direct';
      counts[channel] = (counts[channel] ?? 0) + 1;
    }

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }),

  // ─── Manager performance (поточний місяць) ───────────────────────
  managerStats: authedProcedure.query(async ({ ctx }) => {
    if (!PLANNING_ROLES.includes(ctx.user.role as (typeof PLANNING_ROLES)[number])) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const now = new Date();
    const monthRange = { gte: startOfMonth(now), lte: endOfMonth(now) };

    const managers = await db.user.findMany({
      where: { role: 'CLOSER' },
      select: {
        id: true,
        name: true,
        managedBookings: {
          where: { createdAt: monthRange },
          select: {
            stage: true,
            grandTotal: true,
            paymentLines: {
              where: { status: 'paid' },
              select: { amount: true }
            }
          }
        }
      }
    });

    return managers
      .map((m) => {
        const total = m.managedBookings.length;
        const proposals = m.managedBookings.filter((b) =>
          [
            'PROPOSAL_1',
            'PROPOSAL_2',
            'PROPOSAL_3',
            'PROPOSAL_4',
            'INVOICE',
            'PREPAYMENT',
            'DEVELOPMENT',
            'CHECKIN',
            'CHECKOUT'
          ].includes(b.stage)
        ).length;
        const paid = m.managedBookings.filter((b) =>
          ['PREPAYMENT', 'DEVELOPMENT', 'CHECKIN', 'CHECKOUT'].includes(b.stage)
        ).length;
        const revenue = m.managedBookings.reduce((sum, b) => {
          return sum + b.paymentLines.reduce((s, p) => s + Number(p.amount), 0);
        }, 0);
        const conversion = total > 0 ? (paid / total) * 100 : 0;

        return { id: m.id, name: m.name, total, proposals, paid, revenue, conversion };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }),

  // ─── Overdue payments ─────────────────────────────────────────────
  overduePayments: authedProcedure.query(async ({ ctx }) => {
    const isAdminOrDirector = ['ADMIN', 'DIRECTOR'].includes(ctx.user.role);

    const lines = await db.paymentScheduleLine.findMany({
      where: {
        status: 'pending',
        dueDate: { lt: new Date() },
        ...(!isAdminOrDirector && {
          booking: { closerId: ctx.user.id }
        })
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            guest: { select: { name: true, phone: true } },
            closer: { select: { name: true } }
          }
        }
      },
      orderBy: { dueDate: 'asc' },
      take: 100
    });

    return lines.map((l) => ({
      id: l.id,
      label: l.label,
      amount: Number(l.amount),
      dueDate: l.dueDate,
      overdueDays: l.dueDate ? Math.max(0, differenceInDays(new Date(), new Date(l.dueDate))) : 0,
      booking: l.booking
    }));
  }),

  // ─── Upcoming payments ────────────────────────────────────────────
  upcomingPayments: authedProcedure.query(async ({ ctx }) => {
    const isAdminOrDirector = ['ADMIN', 'DIRECTOR'].includes(ctx.user.role);
    const next30 = new Date();
    next30.setDate(next30.getDate() + 30);

    const lines = await db.paymentScheduleLine.findMany({
      where: {
        status: 'pending',
        dueDate: { gte: new Date(), lte: next30 },
        ...(!isAdminOrDirector && {
          booking: { closerId: ctx.user.id }
        })
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            guest: { select: { name: true, phone: true } },
            closer: { select: { name: true } }
          }
        }
      },
      orderBy: { dueDate: 'asc' },
      take: 100
    });

    return lines.map((l) => ({
      id: l.id,
      label: l.label,
      amount: Number(l.amount),
      dueDate: l.dueDate,
      booking: l.booking
    }));
  }),

  // ─── All payments (register) ──────────────────────────────────────
  allPayments: authedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20)
      })
    )
    .query(async ({ ctx, input }) => {
      const isAdminOrDirector = ['ADMIN', 'DIRECTOR'].includes(ctx.user.role);
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const where = {
        ...(!isAdminOrDirector && {
          booking: { closerId: ctx.user.id }
        })
      };

      const [total, lines] = await db.$transaction([
        db.paymentScheduleLine.count({ where }),
        db.paymentScheduleLine.findMany({
          where,
          include: {
            booking: {
              select: {
                id: true,
                bookingNumber: true,
                guest: { select: { name: true } },
                closer: { select: { name: true } }
              }
            }
          },
          orderBy: { dueDate: 'desc' },
          skip,
          take: limit
        })
      ]);

      return {
        total,
        items: lines.map((l) => ({
          id: l.id,
          label: l.label,
          amount: Number(l.amount),
          dueDate: l.dueDate,
          paidAt: l.paidAt,
          status: l.status,
          booking: l.booking
        }))
      };
    }),

  // ─── Conversion funnel (поточний місяць) ─────────────────────────
  conversionFunnel: authedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const monthRange = { gte: startOfMonth(now), lte: endOfMonth(now) };

    // Загальна кількість звернень за місяць — inquiry + bookings
    const [inquiryCount, bookings] = await db.$transaction([
      db.inquiry.count({ where: { createdAt: monthRange } }),
      db.booking.findMany({
        where: { createdAt: monthRange },
        select: { stage: true }
      })
    ]);

    const proposalCount = bookings.filter((b) =>
      [
        'PROPOSAL_1',
        'PROPOSAL_2',
        'PROPOSAL_3',
        'PROPOSAL_4',
        'INVOICE',
        'PREPAYMENT',
        'DEVELOPMENT',
        'CHECKIN',
        'CHECKOUT'
      ].includes(b.stage)
    ).length;

    const prepayCount = bookings.filter((b) =>
      ['PREPAYMENT', 'DEVELOPMENT', 'CHECKIN', 'CHECKOUT'].includes(b.stage)
    ).length;

    const checkinCount = bookings.filter((b) => ['CHECKIN', 'CHECKOUT'].includes(b.stage)).length;

    const total = Math.max(inquiryCount + bookings.length, 1);

    return [
      { stage: 'Звернення', count: inquiryCount + bookings.length, pct: 100 },
      { stage: 'Пропозиція', count: proposalCount, pct: Math.round((proposalCount / total) * 100) },
      { stage: 'Передоплата', count: prepayCount, pct: Math.round((prepayCount / total) * 100) },
      { stage: 'Заїзд', count: checkinCount, pct: Math.round((checkinCount / total) * 100) }
    ];
  }),

  // ─── Loss reasons (для звітів) ────────────────────────────────────
  lossReasons: authedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 6);

    const lostBookings = await db.booking.findMany({
      where: {
        stage: 'LOST',
        updatedAt: { gte: sixMonthsAgo }
      },
      select: { lostReason: true }
    });

    const counts: Record<string, number> = {};
    for (const b of lostBookings) {
      const reason = b.lostReason ?? 'OTHER';
      counts[reason] = (counts[reason] ?? 0) + 1;
    }

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }),

  // ─── Monthly funnel (6 місяців, для /reports) ─────────────────────
  monthlyFunnel: authedProcedure.query(async ({ ctx }) => {
    if (!['ADMIN', 'DIRECTOR'].includes(ctx.user.role)) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, 'MMM yy') };
    });

    const results = await Promise.all(
      months.map(async ({ start, end, label }) => {
        const bookings = await db.booking.findMany({
          where: { createdAt: { gte: start, lte: end } },
          select: { stage: true }
        });
        const inquiries = await db.inquiry.count({
          where: { createdAt: { gte: start, lte: end } }
        });

        return {
          month: label,
          Звернення: inquiries + bookings.length,
          Пропозиція: bookings.filter((b) =>
            [
              'PROPOSAL_1',
              'PROPOSAL_2',
              'PROPOSAL_3',
              'PROPOSAL_4',
              'INVOICE',
              'PREPAYMENT',
              'DEVELOPMENT',
              'CHECKIN',
              'CHECKOUT'
            ].includes(b.stage)
          ).length,
          Передоплата: bookings.filter((b) =>
            ['PREPAYMENT', 'DEVELOPMENT', 'CHECKIN', 'CHECKOUT'].includes(b.stage)
          ).length,
          Заїзд: bookings.filter((b) => ['CHECKIN', 'CHECKOUT'].includes(b.stage)).length
        };
      })
    );

    return results;
  }),

  // ─── EOD Progress (для today) ─────────────────────────────────────
  eodProgress: authedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const [unprocessedInquiries, bookingsWithoutNextAction, overdueTasks] = await db.$transaction([
      db.inquiry.count({
        where: { status: 'NEW', assignedToId: userId }
      }),
      db.booking.count({
        where: {
          closerId: userId,
          stage: { in: [...ACTIVE_STAGES] }
          // nextAction поки що немає в схемі — пропускаємо цей критерій
        }
      }),
      db.task.count({
        where: {
          assignedToId: userId,
          status: 'PENDING',
          dueAt: { lt: new Date() }
        }
      })
    ]);

    return { unprocessedInquiries, bookingsWithoutNextAction, overdueTasks };
  })
});
