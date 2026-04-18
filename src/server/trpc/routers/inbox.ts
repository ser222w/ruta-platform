import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, authedProcedure } from '../trpc';
import { db } from '@/server/db';
import { sendChannelMessage } from '@/server/services/channels/send';
import type { ChannelType, ConversationStatus } from '@prisma/client';

// =============================================================
// INBOX tRPC ROUTER
// Covers: Inbox CRUD, Conversation list/detail, Message thread, Send, Assign, Resolve
// =============================================================

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

export const inboxRouter = router({
  // ─────────────────────────────────────────────
  // INBOXES (admin)
  // ─────────────────────────────────────────────

  listInboxes: authedProcedure
    .input(
      z
        .object({
          brandId: z.string().optional(),
          channelType: z.string().optional(),
          activeOnly: z.boolean().default(true)
        })
        .optional()
    )
    .query(async ({ input }) => {
      return db.inbox.findMany({
        where: {
          ...(input?.brandId ? { brandId: input.brandId } : {}),
          ...(input?.channelType ? { channelType: input.channelType as ChannelType } : {}),
          ...(input?.activeOnly ? { isActive: true } : {})
        },
        include: { brand: { select: { id: true, name: true, slug: true } } },
        orderBy: { name: 'asc' }
      });
    }),

  createInbox: authedProcedure
    .input(
      z.object({
        channelType: z.string(),
        name: z.string().min(1).max(100),
        brandId: z.string().optional(),
        externalId: z.string().min(1),
        config: z.record(z.string(), z.unknown()).default({})
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'ADMIN' && ctx.user.role !== 'DIRECTOR') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      return db.inbox.create({
        data: {
          channelType: input.channelType as ChannelType,
          name: input.name,
          brandId: input.brandId,
          externalId: input.externalId,
          config: input.config as never
        }
      });
    }),

  updateInbox: authedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        brandId: z.string().optional(),
        isActive: z.boolean().optional(),
        config: z.record(z.string(), z.unknown()).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'ADMIN' && ctx.user.role !== 'DIRECTOR') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const { id, brandId, config, ...rest } = input;
      return db.inbox.update({
        where: { id },
        data: {
          ...rest,
          ...(brandId !== undefined ? { brandId } : {}),
          ...(config !== undefined ? { config: config as never } : {})
        }
      });
    }),

  // ─────────────────────────────────────────────
  // CONVERSATIONS
  // ─────────────────────────────────────────────

  listConversations: authedProcedure
    .input(
      z.object({
        status: z.enum(['OPEN', 'PENDING', 'RESOLVED', 'SPAM', 'ALL']).default('OPEN'),
        channels: z.array(z.string()).optional(),
        brandId: z.string().optional(),
        assignedToMe: z.boolean().default(false),
        unreadOnly: z.boolean().default(false),
        search: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE)
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.status !== 'ALL' ? { status: input.status as ConversationStatus } : {}),
        ...(input.channels?.length ? { channel: { in: input.channels as ChannelType[] } } : {}),
        ...(input.assignedToMe ? { assignedToId: ctx.user.id } : {}),
        ...(input.unreadOnly ? { unreadByManager: true } : {}),
        ...(input.brandId ? { inbox: { brandId: input.brandId } } : {}),
        ...(input.cursor ? { lastMessageAt: { lt: new Date(input.cursor) } } : {})
      };

      const items = await db.conversation.findMany({
        where,
        take: input.limit + 1,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          inbox: {
            select: {
              id: true,
              name: true,
              channelType: true,
              brand: { select: { id: true, name: true } }
            }
          },
          assignedTo: { select: { id: true, name: true, image: true } },
          messages: {
            orderBy: { sentAt: 'desc' },
            take: 1,
            select: { content: true, direction: true, sentAt: true }
          }
        }
      });

      // Cursor pagination
      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop();
        nextCursor = next?.lastMessageAt?.toISOString();
      }

      // Enrich with guest data — keyed by guestId for O(1) lookup in UI
      const guestIds = items.map((c) => c.guestId).filter(Boolean) as string[];
      const guests = guestIds.length
        ? await db.guestProfile.findMany({
            where: { id: { in: guestIds } },
            select: { id: true, name: true, phone: true, telegramChatId: true, loyaltyTier: true }
          })
        : [];

      return { items, nextCursor, guests };
    }),

  getConversation: authedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const conv = await db.conversation.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        inbox: { include: { brand: true } },
        assignedTo: { select: { id: true, name: true, image: true } },
        inquiries: {
          take: 1,
          include: {
            guest: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                loyaltyTier: true,
                totalRevenue: true,
                visitsCount: true,
                telegramChatId: true
              }
            }
          }
        }
      }
    });

    // Linked booking from inquiry
    const inquiry = conv.inquiries[0];
    let booking = null;
    if (inquiry?.bookingId) {
      booking = await db.booking.findUnique({
        where: { id: inquiry.bookingId },
        select: {
          id: true,
          bookingNumber: true,
          stage: true,
          checkinDate: true,
          checkoutDate: true
        }
      });
    }

    return { ...conv, booking };
  }),

  // ─────────────────────────────────────────────
  // MESSAGES
  // ─────────────────────────────────────────────

  getMessages: authedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50)
      })
    )
    .query(async ({ input }) => {
      const items = await db.message.findMany({
        where: {
          conversationId: input.conversationId,
          ...(input.cursor ? { sentAt: { lt: new Date(input.cursor) } } : {})
        },
        take: input.limit + 1,
        orderBy: { sentAt: 'desc' },
        include: {
          sentBy: { select: { id: true, name: true, image: true } }
        }
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop();
        nextCursor = next?.sentAt.toISOString();
      }

      return { items: items.reverse(), nextCursor };
    }),

  sendMessage: authedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1).max(4000),
        attachments: z
          .array(
            z.object({
              url: z.string(),
              mime: z.string(),
              name: z.string(),
              size: z.number().optional()
            })
          )
          .optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      return sendChannelMessage(
        input.conversationId,
        input.content,
        ctx.user.id,
        input.attachments
      );
    }),

  // ─────────────────────────────────────────────
  // CONVERSATION MANAGEMENT
  // ─────────────────────────────────────────────

  assignConversation: authedProcedure
    .input(z.object({ conversationId: z.string(), managerId: z.string().nullable() }))
    .mutation(async ({ input }) => {
      return db.conversation.update({
        where: { id: input.conversationId },
        data: { assignedToId: input.managerId }
      });
    }),

  resolveConversation: authedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ input }) => {
      return db.conversation.update({
        where: { id: input.conversationId },
        data: { status: 'RESOLVED', unreadByManager: false }
      });
    }),

  markRead: authedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ input }) => {
      return db.conversation.update({
        where: { id: input.conversationId },
        data: { unreadByManager: false }
      });
    }),

  // ─────────────────────────────────────────────
  // NOTES
  // ─────────────────────────────────────────────

  getNotes: authedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ input }) => {
      return db.conversationNote.findMany({
        where: { conversationId: input.conversationId },
        include: { createdBy: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: 'asc' }
      });
    }),

  createNote: authedProcedure
    .input(z.object({ conversationId: z.string(), content: z.string().min(1).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      return db.conversationNote.create({
        data: {
          conversationId: input.conversationId,
          content: input.content,
          createdById: ctx.user.id
        },
        include: { createdBy: { select: { id: true, name: true, image: true } } }
      });
    }),

  deleteNote: authedProcedure
    .input(z.object({ noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const note = await db.conversationNote.findUnique({ where: { id: input.noteId } });
      if (!note) throw new TRPCError({ code: 'NOT_FOUND' });
      if (note.createdById !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
      return db.conversationNote.delete({ where: { id: input.noteId } });
    }),

  // ─────────────────────────────────────────────
  // QUICK REPLIES
  // ─────────────────────────────────────────────

  listQuickReplies: authedProcedure
    .input(z.object({ brandId: z.string().optional(), search: z.string().optional() }))
    .query(async ({ input }) => {
      return db.quickReply.findMany({
        where: {
          AND: [
            input.brandId
              ? {
                  OR: [{ brandId: input.brandId }, { brandId: null }]
                }
              : {},
            input.search
              ? {
                  OR: [
                    { title: { contains: input.search, mode: 'insensitive' } },
                    { shortcut: { contains: input.search, mode: 'insensitive' } },
                    { content: { contains: input.search, mode: 'insensitive' } }
                  ]
                }
              : {}
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
    }),

  createQuickReply: authedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(100),
        content: z.string().min(1).max(2000),
        shortcut: z.string().optional(),
        brandId: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      return db.quickReply.create({
        data: { ...input, createdBy: ctx.user.id }
      });
    }),

  deleteQuickReply: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.quickReply.delete({ where: { id: input.id } });
    }),

  // ─────────────────────────────────────────────
  // UNANSWERED CONVERSATIONS
  // ─────────────────────────────────────────────

  getUnansweredCount: authedProcedure.query(async () => {
    const result = await db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::int as count
      FROM "conversations" c
      WHERE c.status = 'OPEN'
        AND (
          SELECT direction FROM "messages" m
          WHERE m."conversationId" = c.id
          ORDER BY m."sentAt" DESC
          LIMIT 1
        ) = 'INBOUND'
    `;
    return { count: Number(result[0]?.count ?? 0) };
  }),

  listUnanswered: authedProcedure
    .input(z.object({ cursor: z.string().optional(), limit: z.number().max(100).default(30) }))
    .query(async ({ input }) => {
      const items = await db.$queryRaw<
        Array<{ id: string; lastMessageAt: Date; waitingSince: Date }>
      >`
        SELECT c.id, c."lastMessageAt",
          (SELECT m."sentAt" FROM "messages" m
           WHERE m."conversationId" = c.id AND m.direction = 'INBOUND'
           ORDER BY m."sentAt" DESC LIMIT 1) as "waitingSince"
        FROM "conversations" c
        WHERE c.status = 'OPEN'
          AND (
            SELECT direction FROM "messages" m
            WHERE m."conversationId" = c.id
            ORDER BY m."sentAt" DESC LIMIT 1
          ) = 'INBOUND'
        ORDER BY "waitingSince" ASC
        LIMIT ${input.limit}
      `;
      return items;
    }),

  // ─────────────────────────────────────────────
  // COUNTS (for badges)
  // ─────────────────────────────────────────────

  getCounts: authedProcedure.query(async ({ ctx }) => {
    const [unread, mine, total] = await Promise.all([
      db.conversation.count({ where: { status: 'OPEN', unreadByManager: true } }),
      db.conversation.count({ where: { status: 'OPEN', assignedToId: ctx.user.id } }),
      db.conversation.count({ where: { status: 'OPEN' } })
    ]);
    return { unread, mine, total };
  }),

  // ─────────────────────────────────────────────
  // GUEST HISTORY
  // ─────────────────────────────────────────────

  getGuestHistory: authedProcedure
    .input(
      z.object({
        guestId: z.string(),
        excludeConversationId: z.string().optional()
      })
    )
    .query(async ({ input }) => {
      return db.conversation.findMany({
        where: {
          inquiries: { some: { guest: { id: input.guestId } } },
          ...(input.excludeConversationId ? { id: { not: input.excludeConversationId } } : {})
        },
        orderBy: { lastMessageAt: 'desc' },
        take: 10,
        include: {
          inbox: { select: { id: true, name: true, channelType: true } },
          messages: {
            orderBy: { sentAt: 'desc' },
            take: 1,
            select: { content: true, sentAt: true }
          }
        }
      });
    })
});
