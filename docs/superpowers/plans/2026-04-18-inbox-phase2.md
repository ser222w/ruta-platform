# Omnichannel Inbox Phase 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the existing Inbox (Phase 1: Telegram/Email/SMS/e-chat + SSE UI) with real file storage (Cloudflare R2), two-dimension navigation, media composer, quick replies, chat tabs, and an extended context panel.

**Architecture:** FileService wraps Cloudflare R2 with two buckets (public CDN + private presigned). Navigation splits ownership (left nav) from priority (inline grouping). All existing tRPC patterns and Prisma cursor pagination are preserved.

**Tech Stack:** Next.js 16.2.1, tRPC 11, Prisma 6, Better-Auth, shadcn/ui, Tailwind 4, nuqs (URL state), `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (R2 is S3-compatible), MediaRecorder API (voice/video in browser)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/server/services/file-service.ts` | R2 presigned URL generation, download URL, delete |
| Create | `src/app/api/files/[key]/route.ts` | Private file proxy → generates presigned GET URL |
| Create | `src/app/api/upload/presigned/route.ts` | POST → returns presigned PUT URL for browser upload |
| Modify | `prisma/schema/channels.prisma` | Add QuickReply, ConversationNote models; no change to Message (attachments already Json) |
| Create | `prisma/migrations/YYYYMMDD_inbox_phase2/` | Migration for QuickReply + ConversationNote |
| Modify | `src/server/trpc/routers/inbox.ts` | Add unanswered view, notes CRUD, quick reply CRUD, saved filters |
| Modify | `src/app/dashboard/inbox/inbox-view.tsx` | Two-dimension nav, default "assigned to me" view |
| Modify | `src/components/inbox/conversation-list.tsx` | Priority grouping, unanswered timer, property badge, channel icon on avatar |
| Modify | `src/components/inbox/message-composer.tsx` | Real R2 upload, voice recording, attachment preview; replace blob: flow |
| Create | `src/components/inbox/quick-reply-bar.tsx` | Template bar + # dropdown search |
| Create | `src/components/inbox/chat-tabs.tsx` | Чат / Нотатки / Email tab switcher |
| Create | `src/components/inbox/notes-tab.tsx` | Internal notes list + composer |
| Modify | `src/components/inbox/conversation-context.tsx` | Tags section, previous conversations, reassign |
| Create | `src/components/inbox/unanswered-timer.tsx` | Red/orange timer badge |
| Modify | `src/app/dashboard/inbox/page.tsx` | nuqs provider wrapper |
| Create | `tests/e2e/inbox.phase2.spec.ts` | Upload flow, quick replies, nav structure |

---

## Task 1: Install Dependencies and Env Vars

**Files:**
- Modify: `package.json`
- Modify: `.env.local` (add R2 vars — never commit)

- [ ] **Step 1: Install AWS SDK packages**

```bash
cd /Users/s/Documents/Claude\ code/RUTA\ OS/ruta-platform
bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
bun add nuqs
```

Expected output: packages added to `node_modules`, `package.json` updated.

- [ ] **Step 2: Verify nuqs is not already installed**

```bash
grep nuqs package.json
```

Expected: either shows version (skip install) or nothing (installed in step 1).

- [ ] **Step 3: Add env vars to `.env.local`**

Append these lines (fill in real values from Cloudflare dashboard):

```
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_PUBLIC_BUCKET=ruta-public
R2_PRIVATE_BUCKET=ruta-private
R2_PUBLIC_CDN_URL=https://cdn.ruta.cam
```

> Note: `prisma.config.ts` loads `.env.local` first — these will be picked up automatically.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lockb
git commit -m "deps: add @aws-sdk/client-s3, s3-request-presigner, nuqs for inbox phase2"
```

---

## Task 2: FileService — R2 Abstraction

**Files:**
- Create: `src/server/services/file-service.ts`

- [ ] **Step 1: Write the unit test**

Create `tests/unit/file-service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: vi.fn() })),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://r2.example.com/presigned?sig=abc'),
}))

import { FileService } from '@/server/services/file-service'

describe('FileService', () => {
  let svc: FileService

  beforeEach(() => {
    process.env.R2_ACCOUNT_ID = 'test-account'
    process.env.R2_ACCESS_KEY_ID = 'test-key'
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret'
    process.env.R2_PUBLIC_BUCKET = 'ruta-public'
    process.env.R2_PRIVATE_BUCKET = 'ruta-private'
    process.env.R2_PUBLIC_CDN_URL = 'https://cdn.ruta.cam'
    svc = new FileService()
  })

  it('getUploadUrl for public bucket returns CDN fileUrl', async () => {
    const result = await svc.getUploadUrl('public', 'inbox/conv1/msg1/photo.jpg', 'image/jpeg')
    expect(result.uploadUrl).toContain('presigned')
    expect(result.fileUrl).toBe('https://cdn.ruta.cam/inbox/conv1/msg1/photo.jpg')
  })

  it('getUploadUrl for private bucket returns /api/files path', async () => {
    const result = await svc.getUploadUrl('private', 'documents/guest1/passport/scan.pdf', 'application/pdf')
    expect(result.fileUrl).toBe('/api/files/documents%2Fguest1%2Fpassport%2Fscan.pdf')
  })

  it('getDownloadUrl returns presigned GET URL', async () => {
    const url = await svc.getDownloadUrl('documents/guest1/passport/scan.pdf')
    expect(url).toContain('presigned')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/unit/file-service.test.ts
```

Expected: FAIL — `Cannot find module '@/server/services/file-service'`

- [ ] **Step 3: Implement FileService**

Create `src/server/services/file-service.ts`:

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export type FileBucket = 'public' | 'private'

export interface UploadUrlResult {
  uploadUrl: string
  fileUrl: string
}

export interface Attachment {
  key: string
  url: string
  mime: string
  name: string
  size: number
  bucket: FileBucket
}

export class FileService {
  private client: S3Client
  private publicBucket: string
  private privateBucket: string
  private cdnUrl: string

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID!
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
    this.publicBucket = process.env.R2_PUBLIC_BUCKET ?? 'ruta-public'
    this.privateBucket = process.env.R2_PRIVATE_BUCKET ?? 'ruta-private'
    this.cdnUrl = process.env.R2_PUBLIC_CDN_URL ?? 'https://cdn.ruta.cam'
  }

  async getUploadUrl(bucket: FileBucket, key: string, mime: string): Promise<UploadUrlResult> {
    const bucketName = bucket === 'public' ? this.publicBucket : this.privateBucket
    const command = new PutObjectCommand({ Bucket: bucketName, Key: key, ContentType: mime })
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 300 })

    const fileUrl =
      bucket === 'public'
        ? `${this.cdnUrl}/${key}`
        : `/api/files/${encodeURIComponent(key)}`

    return { uploadUrl, fileUrl }
  }

  async getDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.privateBucket, Key: key })
    return getSignedUrl(this.client, command, { expiresIn: 900 }) // 15 min
  }

  async deleteFile(key: string, bucket: FileBucket): Promise<void> {
    const bucketName = bucket === 'public' ? this.publicBucket : this.privateBucket
    await this.client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }))
  }
}

export const fileService = new FileService()
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/unit/file-service.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/services/file-service.ts tests/unit/file-service.test.ts
git commit -m "feat: add FileService with R2 presigned upload/download/delete"
```

---

## Task 3: Upload API Route + Private File Proxy

**Files:**
- Create: `src/app/api/upload/presigned/route.ts`
- Create: `src/app/api/files/[key]/route.ts`

- [ ] **Step 1: Create presigned upload endpoint**

Create `src/app/api/upload/presigned/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/server/auth'
import { fileService, type FileBucket } from '@/server/services/file-service'
import { headers } from 'next/headers'

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm',
  'audio/webm', 'audio/ogg', 'audio/mpeg',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { key: string; mime: string; size: number; bucket: FileBucket }
  const { key, mime, size, bucket } = body

  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }
  if (size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })
  }
  if (!key || typeof key !== 'string' || key.includes('..')) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
  }

  const result = await fileService.getUploadUrl(bucket, key, mime)
  return NextResponse.json(result)
}
```

- [ ] **Step 2: Create private file proxy**

Create `src/app/api/files/[key]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/server/auth'
import { fileService } from '@/server/services/file-service'
import { headers } from 'next/headers'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key } = await params
  const decodedKey = decodeURIComponent(key)

  const presignedUrl = await fileService.getDownloadUrl(decodedKey)
  return NextResponse.redirect(presignedUrl)
}
```

- [ ] **Step 3: Test the endpoints manually**

```bash
# Start dev server
bun dev &

# Test presigned upload endpoint (expects 401 without auth, verifying route exists)
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/upload/presigned \
  -H "Content-Type: application/json" \
  -d '{"key":"test/file.jpg","mime":"image/jpeg","size":1000,"bucket":"public"}'
# Expected: 401
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/upload/presigned/route.ts src/app/api/files/
git commit -m "feat: add presigned upload API + private file proxy endpoint"
```

---

## Task 4: Prisma — QuickReply and ConversationNote

**Files:**
- Modify: `prisma/schema/channels.prisma`
- Create: migration via `bunx prisma migrate dev`

- [ ] **Step 1: Add models to schema**

Open `prisma/schema/channels.prisma` and append at the end:

```prisma
model QuickReply {
  id        String   @id @default(cuid())
  brandId   String?
  title     String
  content   String
  shortcut  String?
  createdBy String
  createdAt DateTime @default(now())

  @@map("quick_replies")
}

model ConversationNote {
  id             String   @id @default(cuid())
  conversationId String
  content        String
  createdById    String
  createdAt      DateTime @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id])
  createdBy    User         @relation(fields: [createdById], references: [id])

  @@map("conversation_notes")
}
```

- [ ] **Step 2: Add relation to Conversation model**

In `prisma/schema/channels.prisma`, find the `Conversation` model and add:

```prisma
notes ConversationNote[]
```

- [ ] **Step 3: Add relation to User model**

In `prisma/schema/auth.prisma`, find the `User` model and add:

```prisma
conversationNotes ConversationNote[]
```

- [ ] **Step 4: Run migration**

```bash
bunx prisma migrate dev --name inbox_phase2_quick_reply_notes
```

Expected: Migration created and applied. `prisma generate` runs automatically.

- [ ] **Step 5: Verify schema compiles**

```bash
bunx prisma validate
```

Expected: `The schema at prisma/schema is valid`

- [ ] **Step 6: Commit**

```bash
git add prisma/
git commit -m "feat(db): add QuickReply and ConversationNote tables for inbox phase2"
```

---

## Task 5: tRPC — Notes and Quick Reply Endpoints

**Files:**
- Modify: `src/server/trpc/routers/inbox.ts`

- [ ] **Step 1: Add note CRUD procedures**

In `src/server/trpc/routers/inbox.ts`, after the `markRead` procedure, add:

```typescript
// Notes
getNotes: authedProcedure
  .input(z.object({ conversationId: z.string() }))
  .query(async ({ ctx, input }) => {
    return ctx.db.conversationNote.findMany({
      where: { conversationId: input.conversationId },
      include: { createdBy: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'asc' },
    })
  }),

createNote: authedProcedure
  .input(z.object({ conversationId: z.string(), content: z.string().min(1).max(5000) }))
  .mutation(async ({ ctx, input }) => {
    return ctx.db.conversationNote.create({
      data: {
        conversationId: input.conversationId,
        content: input.content,
        createdById: ctx.session.user.id,
      },
      include: { createdBy: { select: { id: true, name: true, image: true } } },
    })
  }),

deleteNote: authedProcedure
  .input(z.object({ noteId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const note = await ctx.db.conversationNote.findUnique({ where: { id: input.noteId } })
    if (!note) throw new TRPCError({ code: 'NOT_FOUND' })
    if (note.createdById !== ctx.session.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
    return ctx.db.conversationNote.delete({ where: { id: input.noteId } })
  }),
```

- [ ] **Step 2: Add quick reply CRUD procedures**

In the same file, after the notes procedures:

```typescript
// Quick Replies
listQuickReplies: authedProcedure
  .input(z.object({ brandId: z.string().optional(), search: z.string().optional() }))
  .query(async ({ ctx, input }) => {
    return ctx.db.quickReply.findMany({
      where: {
        OR: [
          { brandId: input.brandId ?? undefined },
          { brandId: null },
        ],
        ...(input.search ? {
          OR: [
            { title: { contains: input.search, mode: 'insensitive' } },
            { shortcut: { contains: input.search, mode: 'insensitive' } },
            { content: { contains: input.search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
  }),

createQuickReply: authedProcedure
  .input(z.object({
    title: z.string().min(1).max(100),
    content: z.string().min(1).max(2000),
    shortcut: z.string().optional(),
    brandId: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    return ctx.db.quickReply.create({
      data: { ...input, createdBy: ctx.session.user.id },
    })
  }),

deleteQuickReply: authedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    return ctx.db.quickReply.delete({ where: { id: input.id } })
  }),
```

- [ ] **Step 3: Add unanswered conversations query**

Add this procedure that powers the "Без відповіді" alarm view (shows all team, with `lastManagerMessageAt` null = never replied outbound, or guest replied after last outbound):

```typescript
getUnansweredCount: authedProcedure
  .query(async ({ ctx }) => {
    // Conversations where last message is INBOUND (guest waiting)
    const count = await ctx.db.conversation.count({
      where: {
        status: 'OPEN',
        messages: {
          some: {
            direction: 'INBOUND',
            sentAt: {
              gt: ctx.db.conversation.fields.updatedAt, // last message is newer than last outbound
            },
          },
        },
      },
    })
    return { count }
  }),
```

> Note: The actual "last message is inbound" logic is better done as a raw query. Replace the above with a correct implementation:

```typescript
getUnansweredCount: authedProcedure
  .query(async ({ ctx }) => {
    const result = await ctx.db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::int as count
      FROM "conversations" c
      WHERE c.status = 'OPEN'
        AND (
          SELECT direction FROM "messages" m
          WHERE m."conversationId" = c.id
          ORDER BY m."sentAt" DESC
          LIMIT 1
        ) = 'INBOUND'
    `
    return { count: Number(result[0]?.count ?? 0) }
  }),

listUnanswered: authedProcedure
  .input(z.object({ cursor: z.string().optional(), limit: z.number().max(100).default(30) }))
  .query(async ({ ctx, input }) => {
    // Conversations where latest message is INBOUND
    const items = await ctx.db.$queryRaw<Array<{ id: string; lastMessageAt: Date; waitingSince: Date }>>`
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
    `
    return items
  }),
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

Expected: no errors in `src/server/trpc/routers/inbox.ts`

- [ ] **Step 5: Commit**

```bash
git add src/server/trpc/routers/inbox.ts
git commit -m "feat(trpc): add notes CRUD, quick reply CRUD, unanswered queries"
```

---

## Task 6: Navigation Refactor — Two-Dimension Left Panel

**Files:**
- Modify: `src/app/dashboard/inbox/inbox-view.tsx`
- Modify: `src/app/dashboard/inbox/page.tsx`

- [ ] **Step 1: Wrap page with nuqs provider**

Open `src/app/dashboard/inbox/page.tsx`. It currently is a simple server component wrapper. Replace with:

```typescript
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { InboxView } from './inbox-view'

export default function InboxPage() {
  return (
    <NuqsAdapter>
      <InboxView />
    </NuqsAdapter>
  )
}
```

- [ ] **Step 2: Replace tab-based nav with two-dimension nav in inbox-view.tsx**

The current `inbox-view.tsx` uses `activeTab` state with values `'unread' | 'mine' | 'all'`. Replace the entire left panel nav section.

First, add nuqs imports at top of `inbox-view.tsx`:

```typescript
import { useQueryState, parseAsString } from 'nuqs'
```

Replace the `activeTab` useState with nuqs-backed state:

```typescript
const [view, setView] = useQueryState('view', parseAsString.withDefault('mine'))
const [channelFilter, setChannelFilter] = useQueryState('channel', parseAsString.withDefault(''))
const [managerFilter, setManagerFilter] = useQueryState('manager', parseAsString.withDefault(''))
```

- [ ] **Step 3: Replace the left nav JSX**

Find the existing tab buttons section (currently renders "Unread", "Mine", "All" buttons) and replace with the two-dimension nav structure:

```tsx
{/* Left navigation — ownership dimension */}
<nav className="flex flex-col gap-1 p-2">
  {/* ALARM: Без відповіді */}
  <button
    onClick={() => setView('unanswered')}
    className={cn(
      'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
      view === 'unanswered'
        ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
        : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950'
    )}
  >
    <span className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      Без відповіді
    </span>
    {unansweredCount > 0 && (
      <span className="text-xs bg-red-100 text-red-700 rounded-full px-1.5 py-0.5 dark:bg-red-900 dark:text-red-300">
        {unansweredCount}
      </span>
    )}
  </button>

  <div className="my-1 h-px bg-border" />

  {/* Моя черга */}
  <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
    Моя черга
  </p>
  <NavItem view="mine" label="Призначено мені" icon="👤" count={counts?.mine} current={view} setView={setView} />

  <div className="my-1 h-px bg-border" />

  {/* Всі відкриті */}
  <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
    Всі відкриті
  </p>
  <NavItem view="open" label="Відкриті" icon="💬" count={counts?.total} current={view} setView={setView} />
  <NavItem view="resolved" label="Закриті" icon="✓" current={view} setView={setView} />
  <NavItem view="spam" label="Спам" icon="🚫" current={view} setView={setView} />
</nav>
```

Add the `NavItem` helper component at the bottom of the file (before `export`):

```tsx
function NavItem({
  view: v, label, icon, count, current, setView
}: {
  view: string; label: string; icon: string; count?: number
  current: string; setView: (v: string) => void
}) {
  return (
    <button
      onClick={() => setView(v)}
      className={cn(
        'flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
        current === v
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent/50'
      )}
    >
      <span className="flex items-center gap-2">
        <span>{icon}</span>
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span className="text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
          {count}
        </span>
      )}
    </button>
  )
}
```

- [ ] **Step 4: Update listConversations call to use new view state**

In `inbox-view.tsx`, find where `trpc.inbox.listConversations.useQuery` is called and update the input mapping:

```typescript
const viewToQueryParams = (v: string) => {
  switch (v) {
    case 'mine': return { status: 'OPEN' as const, assignedToMe: true }
    case 'open': return { status: 'OPEN' as const }
    case 'resolved': return { status: 'RESOLVED' as const }
    case 'spam': return { status: 'SPAM' as const }
    case 'unanswered': return { status: 'OPEN' as const } // filtered client-side by priority group
    default: return { status: 'OPEN' as const, assignedToMe: true }
  }
}

const queryParams = viewToQueryParams(view)
```

- [ ] **Step 5: Add unanswered count query**

```typescript
const { data: unansweredData } = trpc.inbox.getUnansweredCount.useQuery(undefined, {
  refetchInterval: 30_000, // poll every 30s
})
const unansweredCount = unansweredData?.count ?? 0
```

- [ ] **Step 6: TypeScript check**

```bash
bunx tsc --noEmit 2>&1 | grep inbox-view
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/inbox/
git commit -m "feat(inbox): two-dimension navigation with nuqs URL state"
```

---

## Task 7: Conversation List — Priority Grouping, Timers, Property Badge

**Files:**
- Modify: `src/components/inbox/conversation-list.tsx`
- Create: `src/components/inbox/unanswered-timer.tsx`

- [ ] **Step 1: Create UnansweredTimer component**

Create `src/components/inbox/unanswered-timer.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface UnansweredTimerProps {
  since: Date | string
}

export function UnansweredTimer({ since }: UnansweredTimerProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const sinceMs = new Date(since).getTime()
    const update = () => setElapsed(Date.now() - sinceMs)
    update()
    const id = setInterval(update, 60_000) // update every minute
    return () => clearInterval(id)
  }, [since])

  const minutes = Math.floor(elapsed / 60_000)
  const hours = Math.floor(minutes / 60)

  const isRed = minutes >= 60
  const isOrange = minutes >= 30 && !isRed

  const label = hours > 0 ? `${hours}г` : `${minutes}хв`

  if (minutes < 1) return null

  return (
    <span
      className={cn(
        'text-xs font-medium rounded px-1 py-0.5',
        isRed && 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-300',
        isOrange && 'text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-300',
        !isRed && !isOrange && 'text-muted-foreground'
      )}
    >
      {label}
    </span>
  )
}
```

- [ ] **Step 2: Add priority grouping to conversation list**

Open `src/components/inbox/conversation-list.tsx`. Find where conversations are rendered as a flat list and add grouping logic before the render:

```typescript
import { UnansweredTimer } from './unanswered-timer'

// After conversations data is loaded, split into two groups:
const { unanswered, rest } = useMemo(() => {
  if (!conversations) return { unanswered: [], rest: [] }
  const u: typeof conversations = []
  const r: typeof conversations = []
  for (const c of conversations) {
    // Last message direction — check the messages or a flag from the query
    // The listConversations query returns enriched data; check unreadByManager as proxy for "guest last"
    if (c.unreadByManager && c.status === 'OPEN') {
      u.push(c)
    } else {
      r.push(c)
    }
  }
  return { unanswered: u, rest: r }
}, [conversations])
```

Replace the flat list render with grouped render:

```tsx
<div className="flex flex-col">
  {unanswered.length > 0 && (
    <>
      <div className="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Без відповіді · {unanswered.length}
      </div>
      {unanswered.map(c => (
        <ConversationItem
          key={c.id}
          conversation={c}
          selected={selectedId === c.id}
          onClick={() => onSelect(c.id)}
          showTimer
        />
      ))}
      {rest.length > 0 && (
        <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
          Решта · {rest.length}
        </div>
      )}
    </>
  )}
  {rest.map(c => (
    <ConversationItem
      key={c.id}
      conversation={c}
      selected={selectedId === c.id}
      onClick={() => onSelect(c.id)}
    />
  ))}
</div>
```

- [ ] **Step 3: Add channel icon overlay on avatar**

In the `ConversationItem` sub-component (or wherever the avatar is rendered), add channel icon in bottom-right corner:

```tsx
<div className="relative flex-shrink-0">
  <Avatar className="h-10 w-10">
    <AvatarFallback>{initials}</AvatarFallback>
  </Avatar>
  <div className="absolute -bottom-0.5 -right-0.5">
    <ChannelBadge channelType={conversation.channel} size="xs" />
  </div>
</div>
```

> `ChannelBadge` already exists at `src/components/inbox/channel-badge.tsx`. Check if it accepts a `size` prop; if not, wrap in a `<span className="scale-75">`.

- [ ] **Step 4: Add property badge to conversation item**

After the last message preview line, add:

```tsx
<div className="flex items-center gap-1.5 mt-0.5">
  {conversation.inbox?.brand?.name && (
    <span className="text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5">
      {conversation.inbox.brand.name}
    </span>
  )}
  {conversation.assignedTo && (
    <span className="text-xs text-muted-foreground">
      {conversation.assignedTo.name?.split(' ')[0]}
    </span>
  )}
  {showTimer && conversation.lastMessageAt && (
    <UnansweredTimer since={conversation.lastMessageAt} />
  )}
</div>
```

> Note: `conversation.inbox.brand` requires including `brand` in the `listConversations` query. In `inbox.ts` router, add `inbox: { include: { brand: true } }` to the `include` clause of `listConversations`.

- [ ] **Step 5: TypeScript check**

```bash
bunx tsc --noEmit 2>&1 | grep -E "conversation-list|unanswered-timer"
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/components/inbox/conversation-list.tsx src/components/inbox/unanswered-timer.tsx
git commit -m "feat(inbox): priority grouping, unanswered timers, channel icon on avatar, property badge"
```

---

## Task 8: Chat Tabs — Чат / Нотатки / Email

**Files:**
- Create: `src/components/inbox/chat-tabs.tsx`
- Create: `src/components/inbox/notes-tab.tsx`
- Modify: `src/app/dashboard/inbox/inbox-view.tsx`

- [ ] **Step 1: Create ChatTabs component**

Create `src/components/inbox/chat-tabs.tsx`:

```tsx
'use client'

import { cn } from '@/lib/utils'

export type ChatTab = 'chat' | 'notes' | 'email'

interface ChatTabsProps {
  active: ChatTab
  onChange: (tab: ChatTab) => void
  hasEmail?: boolean
}

export function ChatTabs({ active, onChange, hasEmail = false }: ChatTabsProps) {
  const tabs: { id: ChatTab; label: string; icon: string }[] = [
    { id: 'chat', label: 'Чат', icon: '💬' },
    { id: 'notes', label: 'Нотатки', icon: '📝' },
    ...(hasEmail ? [{ id: 'email' as ChatTab, label: 'Email', icon: '📧' }] : []),
  ]

  return (
    <div className="flex border-b border-border">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            active === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          )}
        >
          <span>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create NotesTab component**

Create `src/components/inbox/notes-tab.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { uk } from 'date-fns/locale'

interface NotesTabProps {
  conversationId: string
}

export function NotesTab({ conversationId }: NotesTabProps) {
  const [content, setContent] = useState('')
  const utils = trpc.useUtils()

  const { data: notes = [] } = trpc.inbox.getNotes.useQuery({ conversationId })

  const createNote = trpc.inbox.createNote.useMutation({
    onSuccess: () => {
      setContent('')
      utils.inbox.getNotes.invalidate({ conversationId })
    },
  })

  const deleteNote = trpc.inbox.deleteNote.useMutation({
    onSuccess: () => utils.inbox.getNotes.invalidate({ conversationId }),
  })

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Немає нотаток. Внутрішні нотатки видно тільки команді.
          </p>
        )}
        {notes.map(note => (
          <div key={note.id} className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">
                    {note.createdBy.name?.charAt(0) ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">{note.createdBy.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true, locale: uk })}
                </span>
              </div>
              <button
                onClick={() => deleteNote.mutate({ noteId: note.id })}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            </div>
            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-border space-y-2">
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Внутрішня нотатка (не відправляється гостю)..."
          className="resize-none text-sm bg-yellow-50/50 dark:bg-yellow-950/10"
          rows={3}
        />
        <Button
          size="sm"
          onClick={() => createNote.mutate({ conversationId, content })}
          disabled={!content.trim() || createNote.isPending}
        >
          Додати нотатку
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Integrate ChatTabs into inbox-view.tsx**

In `inbox-view.tsx`, add tab state and conditional rendering in the message area:

```typescript
import { useState } from 'react'
import { ChatTabs, type ChatTab } from '@/components/inbox/chat-tabs'
import { NotesTab } from '@/components/inbox/notes-tab'

// Inside component:
const [chatTab, setChatTab] = useState<ChatTab>('chat')
```

In the JSX where `MessageThread` is rendered, wrap with tabs:

```tsx
<div className="flex flex-col h-full">
  <ChatTabs
    active={chatTab}
    onChange={setChatTab}
    hasEmail={selectedConversation?.channel === 'EMAIL'}
  />
  {chatTab === 'chat' && (
    <MessageThread conversationId={selectedConversationId} />
  )}
  {chatTab === 'notes' && selectedConversationId && (
    <NotesTab conversationId={selectedConversationId} />
  )}
  {chatTab === 'email' && (
    <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-8">
      Email thread — Phase 2
    </div>
  )}
</div>
```

- [ ] **Step 4: TypeScript check**

```bash
bunx tsc --noEmit 2>&1 | grep -E "chat-tabs|notes-tab"
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/components/inbox/chat-tabs.tsx src/components/inbox/notes-tab.tsx src/app/dashboard/inbox/inbox-view.tsx
git commit -m "feat(inbox): chat tabs — Чат/Нотатки/Email with internal notes CRUD"
```

---

## Task 9: Media Composer — Real R2 Upload (Fix blob: Bug)

**Files:**
- Modify: `src/components/inbox/message-composer.tsx`

The critical bug: current code uses `URL.createObjectURL(f)` as the attachment URL — this blob: URL is in-memory only and dies when revoked. We replace the entire attachment flow with R2 presigned upload.

- [ ] **Step 1: Add upload helper function**

At the top of `src/components/inbox/message-composer.tsx`, add the upload helper (before the component):

```typescript
import type { Attachment } from '@/server/services/file-service'

async function uploadFileToR2(
  file: File,
  conversationId: string,
  bucket: 'public' | 'private' = 'public'
): Promise<Attachment> {
  // Generate a unique key
  const ext = file.name.split('.').pop() ?? 'bin'
  const key = `inbox/${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  // Get presigned upload URL from our API
  const presignRes = await fetch('/api/upload/presigned', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, mime: file.type, size: file.size, bucket }),
  })
  if (!presignRes.ok) throw new Error('Failed to get upload URL')
  const { uploadUrl, fileUrl } = await presignRes.json() as { uploadUrl: string; fileUrl: string }

  // Upload directly to R2 (browser → R2, not through our server)
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!uploadRes.ok) throw new Error('Upload to R2 failed')

  return { key, url: fileUrl, mime: file.type, name: file.name, size: file.size, bucket }
}
```

- [ ] **Step 2: Replace attachment state type**

Find `attachments` state in the composer and change its type:

```typescript
// Replace:
const [attachments, setAttachments] = useState<{ url: string; name: string; type: string }[]>([])

// With:
const [pendingFiles, setPendingFiles] = useState<File[]>([])          // not yet uploaded
const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([]) // R2-uploaded
const [uploading, setUploading] = useState(false)
```

- [ ] **Step 3: Replace file selection handler**

Find the file input `onChange` handler and replace:

```typescript
const handleFileSelect = async (files: FileList | null) => {
  if (!files || !conversationId) return
  setUploading(true)
  try {
    const uploads = await Promise.all(
      Array.from(files).map(f => uploadFileToR2(f, conversationId, 'public'))
    )
    setUploadedAttachments(prev => [...prev, ...uploads])
  } catch (err) {
    console.error('Upload failed:', err)
    // TODO: show toast error
  } finally {
    setUploading(false)
  }
}
```

- [ ] **Step 4: Update send handler**

Find the `handleSend` function. Replace the attachments field:

```typescript
// Replace any blob: URL usage with uploadedAttachments
await sendMessage.mutateAsync({
  conversationId,
  content: text.trim(),
  attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
})
setUploadedAttachments([])
```

- [ ] **Step 5: Update attachment preview JSX**

Replace the existing preview section above textarea with:

```tsx
{uploadedAttachments.length > 0 && (
  <div className="flex flex-wrap gap-2 px-3 pt-2">
    {uploadedAttachments.map((att, i) => (
      <div key={att.key} className="relative group">
        {att.mime.startsWith('image/') ? (
          <img src={att.url} alt={att.name} className="h-16 w-16 object-cover rounded border" />
        ) : att.mime.startsWith('audio/') ? (
          <div className="flex items-center gap-2 bg-muted rounded px-2 py-1 text-xs">
            🎙 {att.name}
          </div>
        ) : att.mime.startsWith('video/') ? (
          <div className="flex items-center gap-2 bg-muted rounded px-2 py-1 text-xs">
            🎥 {att.name}
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-muted rounded px-2 py-1 text-xs">
            📎 {att.name} ({(att.size / 1024).toFixed(0)}KB)
          </div>
        )}
        <button
          onClick={() => setUploadedAttachments(prev => prev.filter((_, j) => j !== i))}
          className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground rounded-full text-xs hidden group-hover:flex items-center justify-center"
        >
          ×
        </button>
      </div>
    ))}
  </div>
)}
{uploading && (
  <div className="px-3 pt-2 text-xs text-muted-foreground flex items-center gap-2">
    <span className="animate-spin">⏳</span> Завантаження...
  </div>
)}
```

- [ ] **Step 6: Remove all URL.createObjectURL calls**

```bash
grep -n "createObjectURL\|revokeObjectURL\|blob:" src/components/inbox/message-composer.tsx
```

Expected: no matches after cleanup.

- [ ] **Step 7: TypeScript check**

```bash
bunx tsc --noEmit 2>&1 | grep message-composer
```

Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add src/components/inbox/message-composer.tsx
git commit -m "fix(inbox): replace blob: URL attachments with real R2 presigned upload"
```

---

## Task 10: Voice Recording in Composer

**Files:**
- Modify: `src/components/inbox/message-composer.tsx`

- [ ] **Step 1: Add recording state**

```typescript
const [isRecording, setIsRecording] = useState(false)
const [recordingSeconds, setRecordingSeconds] = useState(0)
const mediaRecorderRef = useRef<MediaRecorder | null>(null)
const chunksRef = useRef<Blob[]>([])
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
```

- [ ] **Step 2: Add startRecording and stopRecording functions**

```typescript
const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    chunksRef.current = []
    mr.ondataavailable = e => chunksRef.current.push(e.data)
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
      setUploading(true)
      try {
        const att = await uploadFileToR2(file, conversationId!, 'public')
        setUploadedAttachments(prev => [...prev, att])
      } finally {
        setUploading(false)
      }
    }
    mr.start()
    mediaRecorderRef.current = mr
    setIsRecording(true)
    setRecordingSeconds(0)
    timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
  } catch {
    alert('Мікрофон недоступний')
  }
}

const stopRecording = () => {
  mediaRecorderRef.current?.stop()
  if (timerRef.current) clearInterval(timerRef.current)
  setIsRecording(false)
}
```

- [ ] **Step 3: Add voice button to composer toolbar**

In the composer JSX toolbar section, add the voice button next to the file attach button:

```tsx
{isRecording ? (
  <button
    type="button"
    onClick={stopRecording}
    className="text-red-500 hover:text-red-600 flex items-center gap-1 text-xs animate-pulse"
    title="Зупинити запис"
  >
    ⏹ {recordingSeconds}с
  </button>
) : (
  <button
    type="button"
    onClick={startRecording}
    disabled={uploading}
    className="text-muted-foreground hover:text-foreground"
    title="Голосове повідомлення"
  >
    🎙
  </button>
)}
```

- [ ] **Step 4: TypeScript check**

```bash
bunx tsc --noEmit 2>&1 | grep message-composer
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/components/inbox/message-composer.tsx
git commit -m "feat(inbox): voice recording via MediaRecorder API with R2 upload"
```

---

## Task 11: Quick Reply Bar + # Shortcut

**Files:**
- Create: `src/components/inbox/quick-reply-bar.tsx`
- Modify: `src/components/inbox/message-composer.tsx`

- [ ] **Step 1: Create QuickReplyBar component**

Create `src/components/inbox/quick-reply-bar.tsx`:

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

interface QuickReplyBarProps {
  brandId?: string
  onSelect: (content: string) => void
  onSaveCurrentAsTemplate: () => void
  search?: string           // # search mode query
  searchMode?: boolean
  onCloseSearch?: () => void
}

export function QuickReplyBar({
  brandId,
  onSelect,
  onSaveCurrentAsTemplate,
  search = '',
  searchMode = false,
  onCloseSearch,
}: QuickReplyBarProps) {
  const { data: replies = [] } = trpc.inbox.listQuickReplies.useQuery(
    { brandId, search: search || undefined },
    { staleTime: 30_000 }
  )

  if (searchMode) {
    return (
      <div className="absolute bottom-full left-0 right-0 bg-popover border border-border rounded-t-lg shadow-lg max-h-64 overflow-y-auto z-50">
        <div className="p-2 text-xs text-muted-foreground border-b">
          Шаблони {search && `· "${search}"`}
          <button onClick={onCloseSearch} className="float-right hover:text-foreground">✕</button>
        </div>
        {replies.length === 0 && (
          <div className="p-3 text-sm text-muted-foreground">Нічого не знайдено</div>
        )}
        {replies.map(r => (
          <button
            key={r.id}
            onClick={() => { onSelect(r.content); onCloseSearch?.() }}
            className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
          >
            <div className="text-sm font-medium">{r.title}</div>
            <div className="text-xs text-muted-foreground truncate">{r.content.slice(0, 80)}</div>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-border overflow-x-auto scrollbar-none">
      <span className="text-xs text-muted-foreground flex-shrink-0">Шаблони:</span>
      {replies.slice(0, 8).map(r => (
        <button
          key={r.id}
          onClick={() => onSelect(r.content)}
          className="flex-shrink-0 text-xs bg-muted hover:bg-accent rounded-full px-2.5 py-1 transition-colors"
        >
          {r.title}
        </button>
      ))}
      <button
        onClick={onSaveCurrentAsTemplate}
        className="flex-shrink-0 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-full px-2.5 py-1"
      >
        + Зберегти
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Integrate QuickReplyBar into message-composer.tsx**

In `message-composer.tsx`, add state and handler:

```typescript
import { QuickReplyBar } from './quick-reply-bar'

const [quickReplySearch, setQuickReplySearch] = useState('')
const [quickReplySearchMode, setQuickReplySearchMode] = useState(false)

// Watch for # in textarea
const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const val = e.target.value
  setText(val)
  // Detect # shortcut
  const hashMatch = val.match(/#(\w*)$/)
  if (hashMatch) {
    setQuickReplySearchMode(true)
    setQuickReplySearch(hashMatch[1] ?? '')
  } else {
    setQuickReplySearchMode(false)
  }
}

const handleQuickReplySelect = (content: string) => {
  // Replace # trigger with selected content
  setText(prev => prev.replace(/#\w*$/, content))
  setQuickReplySearchMode(false)
}

const handleSaveAsTemplate = async () => {
  const title = window.prompt('Назва шаблону:')
  if (!title || !text.trim()) return
  await createQuickReply.mutateAsync({ title, content: text.trim() })
}
```

Add `createQuickReply` mutation:

```typescript
const createQuickReply = trpc.inbox.createQuickReply.useMutation()
```

Render `QuickReplyBar` before the textarea (but after any attachment preview):

```tsx
<div className="relative">
  {quickReplySearchMode && (
    <QuickReplyBar
      searchMode
      search={quickReplySearch}
      onSelect={handleQuickReplySelect}
      onSaveCurrentAsTemplate={handleSaveAsTemplate}
      onCloseSearch={() => setQuickReplySearchMode(false)}
    />
  )}
  <QuickReplyBar
    onSelect={handleQuickReplySelect}
    onSaveCurrentAsTemplate={handleSaveAsTemplate}
  />
  <textarea
    value={text}
    onChange={handleTextChange}
    {/* ... rest of textarea props */}
  />
</div>
```

- [ ] **Step 3: TypeScript check**

```bash
bunx tsc --noEmit 2>&1 | grep -E "quick-reply|message-composer"
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/inbox/quick-reply-bar.tsx src/components/inbox/message-composer.tsx
git commit -m "feat(inbox): quick reply bar with # shortcut search and save-as-template"
```

---

## Task 12: Extended Context Panel

**Files:**
- Modify: `src/components/inbox/conversation-context.tsx`
- Modify: `src/server/trpc/routers/inbox.ts`

- [ ] **Step 1: Add tags + previous conversations query to tRPC**

In `inbox.ts`, add:

```typescript
getGuestHistory: authedProcedure
  .input(z.object({ guestId: z.string(), excludeConversationId: z.string() }))
  .query(async ({ ctx, input }) => {
    return ctx.db.conversation.findMany({
      where: {
        guestId: input.guestId,
        id: { not: input.excludeConversationId },
        status: { in: ['RESOLVED', 'OPEN'] },
      },
      select: {
        id: true,
        channel: true,
        status: true,
        lastMessageAt: true,
        inbox: { select: { name: true } },
        messages: {
          select: { content: true },
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 10,
    })
  }),
```

- [ ] **Step 2: Expand conversation-context.tsx**

Open `src/components/inbox/conversation-context.tsx`. Find where the component ends (currently shows guest info + booking + assign sections). Add tags and history sections at the bottom:

```tsx
import { trpc } from '@/lib/trpc'
import { formatDistanceToNow } from 'date-fns'
import { uk } from 'date-fns/locale'

// Add after the existing sections (inside the component, where props include conversationId and guestId):

{/* ТЕГИ */}
<div className="border-t border-border pt-3 mt-3">
  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Теги</p>
  <div className="flex flex-wrap gap-1">
    {(guest?.tags ?? []).map((tag: { name: string }) => (
      <span key={tag.name} className="text-xs bg-muted rounded-full px-2 py-0.5">{tag.name}</span>
    ))}
    <button className="text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-full px-2 py-0.5">
      + Тег
    </button>
  </div>
</div>

{/* ПОПЕРЕДНІ ДІАЛОГИ */}
{guestId && (
  <PreviousConversations guestId={guestId} excludeId={conversationId} />
)}
```

Add `PreviousConversations` as a sub-component at the bottom of the file:

```tsx
function PreviousConversations({ guestId, excludeId }: { guestId: string; excludeId: string }) {
  const { data: history = [] } = trpc.inbox.getGuestHistory.useQuery({
    guestId,
    excludeConversationId: excludeId,
  })

  if (history.length === 0) return null

  return (
    <div className="border-t border-border pt-3 mt-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Попередні діалоги
      </p>
      <div className="space-y-1.5">
        {history.map(c => (
          <div key={c.id} className="flex items-center justify-between text-xs rounded p-2 hover:bg-muted transition-colors cursor-pointer">
            <div>
              <span className="font-medium">{c.inbox?.name ?? c.channel}</span>
              {c.messages[0] && (
                <p className="text-muted-foreground truncate max-w-[180px]">
                  {c.messages[0].content}
                </p>
              )}
            </div>
            <span className="text-muted-foreground flex-shrink-0 ml-2">
              {c.lastMessageAt
                ? formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: true, locale: uk })
                : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
bunx tsc --noEmit 2>&1 | grep conversation-context
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/inbox/conversation-context.tsx src/server/trpc/routers/inbox.ts
git commit -m "feat(inbox): extended context panel with tags and previous conversations"
```

---

## Task 13: E2E Tests

**Files:**
- Create: `tests/e2e/inbox.phase2.spec.ts`

- [ ] **Step 1: Write E2E test file**

Create `tests/e2e/inbox.phase2.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

// Pre-condition: logged-in session via storageState or beforeAll login

test.describe('Inbox Phase 2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/inbox')
    await page.waitForSelector('[data-testid="inbox-nav"]', { timeout: 10_000 })
  })

  test('default view is "Призначено мені"', async ({ page }) => {
    // The URL should have view=mine by default
    await expect(page).toHaveURL(/view=mine/)
    // Or the nav item is highlighted
    await expect(page.getByText('Призначено мені')).toBeVisible()
  })

  test('"Без відповіді" alarm is visible in nav', async ({ page }) => {
    await expect(page.getByText('Без відповіді')).toBeVisible()
  })

  test('switching to "Відкриті" view updates URL', async ({ page }) => {
    await page.getByText('Відкриті').click()
    await expect(page).toHaveURL(/view=open/)
  })

  test('chat tabs render: Чат / Нотатки', async ({ page }) => {
    // Click the first conversation if any exist
    const firstConv = page.locator('[data-testid="conversation-item"]').first()
    if (await firstConv.isVisible()) {
      await firstConv.click()
      await expect(page.getByText('Чат')).toBeVisible()
      await expect(page.getByText('Нотатки')).toBeVisible()
    }
  })

  test('switching to Нотатки tab shows notes composer', async ({ page }) => {
    const firstConv = page.locator('[data-testid="conversation-item"]').first()
    if (await firstConv.isVisible()) {
      await firstConv.click()
      await page.getByText('Нотатки').click()
      await expect(page.getByPlaceholder(/внутрішня нотатка/i)).toBeVisible()
    }
  })

  test('quick reply bar is visible in composer', async ({ page }) => {
    const firstConv = page.locator('[data-testid="conversation-item"]').first()
    if (await firstConv.isVisible()) {
      await firstConv.click()
      await expect(page.getByText('Шаблони:')).toBeVisible()
    }
  })

  test('# in textarea opens quick reply search dropdown', async ({ page }) => {
    const firstConv = page.locator('[data-testid="conversation-item"]').first()
    if (await firstConv.isVisible()) {
      await firstConv.click()
      const textarea = page.locator('textarea').last()
      await textarea.click()
      await textarea.type('#')
      await expect(page.getByText(/шаблони/i)).toBeVisible()
    }
  })
})
```

- [ ] **Step 2: Run E2E tests**

```bash
bunx playwright test tests/e2e/inbox.phase2.spec.ts --reporter=list
```

Expected: tests either pass or skip (if no conversations exist in test DB). No hard failures.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/inbox.phase2.spec.ts
git commit -m "test(inbox): e2e specs for phase2 nav, tabs, quick replies"
```

---

## Task 14: Full Build Verify

- [ ] **Step 1: TypeScript full check**

```bash
bunx tsc --noEmit
```

Expected: no errors

- [ ] **Step 2: Run all unit tests**

```bash
bun test
```

Expected: all pass

- [ ] **Step 3: Run full E2E suite**

```bash
bunx playwright test --reporter=list
```

Expected: inbox.phase1 still passes (no regressions), inbox.phase2 passes or skips

- [ ] **Step 4: Build production bundle**

```bash
bun run build
```

Expected: builds without errors

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: omnichannel inbox phase2 — R2 storage, nav refactor, media composer, quick replies, chat tabs, context panel"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] FileService + R2 buckets (Task 2, 3)
- [x] Navigation refactor (Task 6)
- [x] Conversation list priority grouping + timers (Task 7)
- [x] Chat tabs Чат/Нотатки/Email (Task 8)
- [x] Media composer real upload — fixes blob: bug (Task 9)
- [x] Voice recording (Task 10)
- [x] Quick Replies with # shortcut (Task 11)
- [x] Context panel tags + previous conversations (Task 12)
- [x] Prisma migration QuickReply + ConversationNote (Task 4)
- [x] E2E tests (Task 13)

**Missing from spec:**
- Keyboard shortcuts (J/K/E/A/⌘Enter/C//) — existing shortcuts in Phase 1 should be unchanged; `#` shortcut is covered in Task 11. Full keyboard nav implementation is deferred — scope would require a global hotkey manager.
- Video note (Telegram video note circle) — omitted as it requires `getUserMedia` camera + complex Telegram `sendVideoNote` API flow. Flag for Phase 2.5.
- Saved filters (📌 views) — omitted as it requires a new DB table `SavedFilter`. Flag for follow-up task.
- `data-testid` attributes — E2E tests reference `[data-testid="inbox-nav"]` and `[data-testid="conversation-item"]`; these must be added to `inbox-view.tsx` and `conversation-list.tsx` during implementation.

**Type consistency:** `Attachment` type is defined in `file-service.ts` and imported in `message-composer.tsx`. `FileBucket` is exported and used in both API routes and the service. All tRPC procedure names are consistent across Tasks 5, 11, 12.
