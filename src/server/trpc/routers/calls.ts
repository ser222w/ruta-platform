import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '@/server/db';
import { Prisma } from '@prisma/client';

export const callsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(50),
        direction: z.enum(['INCOMING', 'OUTGOING', 'CALLBACK']).nullish(),
        status: z.enum(['ACTIVE', 'COMPLETED', 'MISSED', 'ABANDONED']).nullish(),
        search: z.string().nullish(),
        hasRecording: z.boolean().nullish(),
        dateFrom: z.string().nullish(),
        dateTo: z.string().nullish()
      })
    )
    .query(async ({ input }) => {
      const where: Prisma.PhoneCallWhereInput = {};

      if (input.direction) where.direction = input.direction;
      if (input.status) where.status = input.status;
      if (input.hasRecording != null) where.hasRecording = input.hasRecording;

      if (input.search) {
        where.OR = [
          { callerPhone: { contains: input.search, mode: 'insensitive' } },
          { calleePhone: { contains: input.search, mode: 'insensitive' } },
          { employeeName: { contains: input.search, mode: 'insensitive' } },
          { managerEmail: { contains: input.search, mode: 'insensitive' } }
        ];
      }

      if (input.dateFrom || input.dateTo) {
        where.calledAt = {};
        if (input.dateFrom) where.calledAt.gte = new Date(input.dateFrom);
        if (input.dateTo) {
          const to = new Date(input.dateTo);
          to.setHours(23, 59, 59, 999);
          where.calledAt.lte = to;
        }
      }

      const skip = (input.page - 1) * input.limit;

      const [items, total] = await Promise.all([
        db.phoneCall.findMany({
          where,
          orderBy: { calledAt: 'desc' },
          skip,
          take: input.limit,
          include: { inquiry: { select: { id: true } } }
        }),
        db.phoneCall.count({ where })
      ]);

      return { items, total };
    }),

  stats: protectedProcedure.query(async () => {
    const [total, missed, completed, withRecording] = await Promise.all([
      db.phoneCall.count(),
      db.phoneCall.count({ where: { status: 'MISSED' } }),
      db.phoneCall.count({ where: { status: 'COMPLETED' } }),
      db.phoneCall.count({ where: { hasRecording: true } })
    ]);
    return { total, missed, completed, withRecording };
  })
});
