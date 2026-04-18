# PhoneLink Click-to-Call Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all plain-text phone numbers across Ruta OS with a `<PhoneLink>` component that initiates a Ringostat Smart Phone call on click.

**Architecture:** Single shared client component calls existing `callGuest()` Server Action. No new API code needed — `callGuest()` in `src/server/ringostat/actions.ts` already calls Ringostat `callback/outward_call`. Component replaces 8 plain `{phone}` renders across the dashboard.

**Tech Stack:** Next.js 15 App Router, React `useTransition`, sonner toasts, existing `callGuest()` Server Action, shadcn/ui `Button` (variant=ghost), `@/components/icons` (Icons.phone)

---

### Task 1: Create `<PhoneLink>` component

**Files:**
- Create: `src/components/shared/phone-link.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { callGuest } from '@/server/ringostat/actions';

interface PhoneLinkProps {
  phone: string | null | undefined;
  className?: string;
}

export function PhoneLink({ phone, className }: PhoneLinkProps) {
  const [isPending, startTransition] = useTransition();

  if (!phone) return null;

  function handleClick() {
    startTransition(async () => {
      const result = await callGuest(phone!);
      if (result.ok) {
        toast.success('Дзвінок ініційовано — очікуйте дзвінок на ваш телефон');
      } else {
        toast.error(result.error ?? 'Не вдалося ініціювати дзвінок');
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'inline-flex items-center gap-1 text-sm hover:underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity',
        className
      )}
      title='Натисніть щоб зателефонувати'
    >
      <Icons.phone className='h-3 w-3 shrink-0' />
      {isPending ? 'Дзвоню...' : phone}
    </button>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
cd ruta-platform && bun run typecheck 2>&1 | grep -i "phone-link\|PhoneLink" | head -10
```

Expected: no errors mentioning phone-link

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/phone-link.tsx
git commit -m "feat: add PhoneLink click-to-call component"
```

---

### Task 2: Update `inquiries/[id]/page.tsx` — replace button with PhoneLink

**Files:**
- Modify: `src/app/dashboard/inquiries/[id]/page.tsx`

Current state: has `handleCall()` function, `isCalling` transition, and a separate "Дзвонити" button next to the phone number. Replace with `<PhoneLink>`.

- [ ] **Step 1: Remove old call logic and add PhoneLink import**

Remove the `callGuest` import and `handleCall`/`isCalling` state. Add PhoneLink import:

```tsx
// REMOVE these lines:
import { callGuest } from '@/server/ringostat/actions';
// (and remove: const [isCalling, startCall] = useTransition();)
// (and remove: function handleCall(phone: string) { ... })

// ADD:
import { PhoneLink } from '@/components/shared/phone-link';
```

- [ ] **Step 2: Replace the phone display block**

Find the block around line 189:
```tsx
const phone = inquiry.guest?.phone ?? inquiry.contactPhone;
// ...
<p className='text-sm'>{phone}</p>
// ...
<Icons.phone className='h-3.5 w-3.5 mr-1' />
{isCalling ? 'Дзвоню...' : 'Дзвонити'}
```

Replace with:
```tsx
const phone = inquiry.guest?.phone ?? inquiry.contactPhone;
// ...
<PhoneLink phone={phone} />
```

Remove the entire separate "Дзвонити" button element.

- [ ] **Step 3: Typecheck**

```bash
bun run typecheck 2>&1 | grep "inquiries" | head -10
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/inquiries/\[id\]/page.tsx
git commit -m "feat: replace call button with PhoneLink in inquiry detail"
```

---

### Task 3: Update `inquiries/page.tsx` — list view

**Files:**
- Modify: `src/app/dashboard/inquiries/page.tsx`

- [ ] **Step 1: Add import**

```tsx
import { PhoneLink } from '@/components/shared/phone-link';
```

- [ ] **Step 2: Replace phone text at line ~117**

Find:
```tsx
{inq.guest?.phone ?? inq.contactPhone}
```

Replace with:
```tsx
<PhoneLink phone={inq.guest?.phone ?? inq.contactPhone} />
```

- [ ] **Step 3: Typecheck**

```bash
bun run typecheck 2>&1 | grep "inquiries" | head -10
```

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/inquiries/page.tsx
git commit -m "feat: PhoneLink in inquiries list"
```

---

### Task 4: Update `bookings/[id]/page.tsx` — expand InfoRow to accept ReactNode

**Files:**
- Modify: `src/app/dashboard/bookings/[id]/page.tsx`

`InfoRow` currently accepts `value: string | null`. Need to expand to `ReactNode` so `<PhoneLink>` can be passed as value.

- [ ] **Step 1: Update InfoRow type and render**

Find:
```tsx
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className='flex items-start gap-3'>
      <p className='text-muted-foreground text-xs w-20 shrink-0 pt-0.5'>{label}</p>
      <p className='text-sm'>{value}</p>
```

Replace with:
```tsx
function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className='flex items-start gap-3'>
      <p className='text-muted-foreground text-xs w-20 shrink-0 pt-0.5'>{label}</p>
      <div className='text-sm'>{value}</div>
```

- [ ] **Step 2: Add React import if missing**

Check top of file for `import React` or `import type { ReactNode }`. If absent add:
```tsx
import type { ReactNode } from 'react';
// and update InfoRow signature to value?: ReactNode
```

- [ ] **Step 3: Add PhoneLink import and update phone row**

```tsx
import { PhoneLink } from '@/components/shared/phone-link';
```

Find line ~180:
```tsx
<InfoRow label='Телефон' value={booking.guest.phone} />
```

Replace:
```tsx
<InfoRow label='Телефон' value={<PhoneLink phone={booking.guest.phone} />} />
```

- [ ] **Step 4: Typecheck**

```bash
bun run typecheck 2>&1 | grep "bookings" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/bookings/\[id\]/page.tsx
git commit -m "feat: PhoneLink in booking detail + InfoRow accepts ReactNode"
```

---

### Task 5: Update `bookings/page.tsx`, `payments/page.tsx` — list views

**Files:**
- Modify: `src/app/dashboard/bookings/page.tsx`
- Modify: `src/app/dashboard/payments/page.tsx`

- [ ] **Step 1: bookings/page.tsx — add import and replace**

Add import:
```tsx
import { PhoneLink } from '@/components/shared/phone-link';
```

Find lines ~105-106:
```tsx
{booking.guest?.phone && (
  <p className='text-muted-foreground text-xs'>{booking.guest.phone}</p>
)}
```

Replace:
```tsx
<PhoneLink phone={booking.guest?.phone} className='text-muted-foreground text-xs' />
```

- [ ] **Step 2: payments/page.tsx — add import and replace**

Add import:
```tsx
import { PhoneLink } from '@/components/shared/phone-link';
```

Find lines ~113-114:
```tsx
{line.booking?.guest?.phone && (
  <p className='text-muted-foreground text-xs'>{line.booking.guest.phone}</p>
)}
```

Replace:
```tsx
<PhoneLink phone={line.booking?.guest?.phone} className='text-muted-foreground text-xs' />
```

- [ ] **Step 3: Typecheck**

```bash
bun run typecheck 2>&1 | grep -E "bookings/page|payments" | head -10
```

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/bookings/page.tsx src/app/dashboard/payments/page.tsx
git commit -m "feat: PhoneLink in bookings and payments list views"
```

---

### Task 6: Update CRM components

**Files:**
- Modify: `src/components/crm/booking-card.tsx`
- Modify: `src/components/crm/booking-detail-sheet.tsx`

- [ ] **Step 1: booking-card.tsx**

Add import:
```tsx
import { PhoneLink } from '@/components/shared/phone-link';
```

Find lines ~75-76:
```tsx
{booking.guest?.phone && (
  <p className='text-xs text-muted-foreground mt-0.5'>{booking.guest.phone}</p>
)}
```

Replace:
```tsx
<PhoneLink phone={booking.guest?.phone} className='text-xs text-muted-foreground mt-0.5' />
```

- [ ] **Step 2: booking-detail-sheet.tsx**

Add import:
```tsx
import { PhoneLink } from '@/components/shared/phone-link';
```

Find lines ~91-92:
```tsx
{booking.guest.phone && (
  <p className='text-sm text-muted-foreground'>{booking.guest.phone}</p>
)}
```

Replace:
```tsx
<PhoneLink phone={booking.guest.phone} className='text-sm text-muted-foreground' />
```

- [ ] **Step 3: Typecheck**

```bash
bun run typecheck 2>&1 | grep "crm" | head -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/crm/booking-card.tsx src/components/crm/booking-detail-sheet.tsx
git commit -m "feat: PhoneLink in CRM kanban card and detail sheet"
```

---

### Task 7: Update Inbox conversation context

**Files:**
- Modify: `src/components/inbox/conversation-context.tsx`

- [ ] **Step 1: Add import and replace**

Add import:
```tsx
import { PhoneLink } from '@/components/shared/phone-link';
```

Find line ~67:
```tsx
{guest.phone && <p className='text-muted-foreground text-sm'>{guest.phone}</p>}
```

Replace:
```tsx
<PhoneLink phone={guest.phone} className='text-muted-foreground text-sm' />
```

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck 2>&1 | grep "inbox" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/inbox/conversation-context.tsx
git commit -m "feat: PhoneLink in inbox conversation context"
```

---

### Task 8: Full typecheck + lint + deploy

- [ ] **Step 1: Full typecheck and lint**

```bash
bun run typecheck && bun run lint
```

Expected: 0 errors, 0 warnings related to new files

- [ ] **Step 2: Push and deploy**

```bash
git push origin main
```

Wait ~3-4 min for Coolify build.

- [ ] **Step 3: Smoke test**

```bash
npx playwright screenshot https://app.ruta.cam/dashboard/inquiries --output /tmp/smoke-inquiries.png
npx playwright screenshot https://app.ruta.cam/dashboard/bookings --output /tmp/smoke-bookings.png
```

Verify phone numbers appear with phone icon and are clickable.

- [ ] **Step 4: Update CHANGELOG**

Add to `CHANGELOG.md` under `[Unreleased]`:
```markdown
### Added
- `PhoneLink` component — клік по номеру телефону ініціює дзвінок через Ringostat Smart Phone у всіх 8 місцях системи (заявки, бронювання, платежі, CRM, inbox)
```

- [ ] **Step 5: Final commit**

```bash
git add CHANGELOG.md
git commit -m "docs: changelog PhoneLink click-to-call"
```
