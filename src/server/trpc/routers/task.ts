import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, authedProcedure } from '../trpc';
import { db } from '@/server/db';
import { TaskType, TaskStatus } from '@prisma/client';

// ============================================================
// Схеми
// ============================================================

const createTaskSchema = z.object({
  type: z.nativeEnum(TaskType).default('MANUAL'),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  assignedToId: z.string(),
  bookingId: z.string().optional(),
  inquiryId: z.string().optional(),
  guestId: z.string().optional(),
  dueAt: z.string().datetime().optional()
});

const listTaskSchema = z.object({
  assignedToId: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  bookingId: z.string().optional(),
  overdue: z.boolean().optional(),
  today: z.boolean().optional()
});

// ============================================================
// Router
// ============================================================

export const taskRouter = router({
  // Задачі моєї черги (сьогодні + прострочені)
  getMyQueue: authedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const tasks = await db.task.findMany({
      where: {
        assignedToId: ctx.user.id,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        OR: [{ dueAt: { lte: todayEnd } }, { dueAt: null }]
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
      include: {
        booking: {
          select: { id: true, bookingNumber: true, stage: true, guest: { select: { name: true } } }
        },
        inquiry: { select: { id: true, contactName: true, status: true } }
      }
    });

    const overdue = tasks.filter((t) => t.dueAt && t.dueAt < now);
    const dueTodayOrLater = tasks.filter((t) => !t.dueAt || t.dueAt >= now);

    return { overdue, today: dueTodayOrLater, total: tasks.length };
  }),

  // Список задач з фільтрами
  list: authedProcedure.input(listTaskSchema).query(async ({ ctx, input }) => {
    const now = new Date();

    const where: Record<string, unknown> = {};

    if (ctx.user.role === 'CLOSER' || ctx.user.role === 'FARMER') {
      where.assignedToId = ctx.user.id;
    } else if (input.assignedToId) {
      where.assignedToId = input.assignedToId;
    }

    if (input.status) where.status = input.status;
    if (input.bookingId) where.bookingId = input.bookingId;

    if (input.overdue) {
      where.dueAt = { lt: now };
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
    }

    if (input.today) {
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);
      where.dueAt = { lte: todayEnd };
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
    }

    return db.task.findMany({
      where,
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        assignedTo: { select: { id: true, name: true } },
        booking: { select: { id: true, bookingNumber: true, stage: true } },
        inquiry: { select: { id: true, contactName: true } }
      }
    });
  }),

  // Створити задачу
  create: authedProcedure.input(createTaskSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.ability.can('create', 'Booking')) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    return db.task.create({
      data: {
        type: input.type,
        title: input.title,
        description: input.description,
        assignedToId: input.assignedToId,
        bookingId: input.bookingId,
        inquiryId: input.inquiryId,
        guestId: input.guestId,
        dueAt: input.dueAt ? new Date(input.dueAt) : undefined
      },
      include: {
        assignedTo: { select: { id: true, name: true } }
      }
    });
  }),

  // Завершити задачу
  complete: authedProcedure
    .input(z.object({ id: z.string(), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const task = await db.task.findUnique({
        where: { id: input.id },
        select: { id: true, assignedToId: true, bookingId: true }
      });

      if (!task) throw new TRPCError({ code: 'NOT_FOUND' });
      if (
        task.assignedToId !== ctx.user.id &&
        ctx.user.role !== 'ADMIN' &&
        ctx.user.role !== 'DIRECTOR'
      ) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      return db.$transaction(async (tx) => {
        const updated = await tx.task.update({
          where: { id: input.id },
          data: { status: 'DONE', doneAt: new Date() }
        });

        // Якщо є нотатка і задача прив'язана до бронювання → логуємо
        if (input.note && task.bookingId) {
          await tx.activity.create({
            data: {
              bookingId: task.bookingId,
              userId: ctx.user.id,
              type: 'TASK_DONE',
              title: `Задача завершена`,
              body: input.note
            }
          });
        }

        return updated;
      });
    })
});
