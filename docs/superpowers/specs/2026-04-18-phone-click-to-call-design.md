# PhoneLink Click-to-Call — Design Spec

**Date:** 2026-04-18  
**Status:** Approved

## Problem

Phone numbers are displayed as plain text in 8 places across Ruta OS. Clicking them should initiate a call via Ringostat Smart Phone (manager's SIP app rings first, then connects to guest). Currently only `/inquiries/[id]` has a separate "Дзвонити" button.

## Solution

Single shared component `<PhoneLink phone={phone} />` that:
- Renders phone as clickable text with phone icon
- On click → calls `callGuest()` Server Action → Ringostat `callback/outward_call` API
- Shows `toast.success` / `toast.error` feedback
- Looks like text (not a button), underline on hover
- Handles null/empty gracefully (renders plain text)

## Places to update (8 locations)

| File | Current | Replace with |
|------|---------|--------------|
| `inquiries/[id]/page.tsx` | `<p>{phone}</p>` + separate button | `<PhoneLink phone={phone} />` |
| `inquiries/page.tsx:117` | `{inq.guest?.phone ?? inq.contactPhone}` | `<PhoneLink phone={...} />` |
| `bookings/[id]/page.tsx:180` | `<InfoRow label='Телефон' value={phone} />` | `<InfoRow label='Телефон' value={<PhoneLink phone={phone} />} />` |
| `bookings/page.tsx:105-106` | `<p>{phone}</p>` | `<PhoneLink phone={phone} />` |
| `payments/page.tsx:113-114` | `<p>{phone}</p>` | `<PhoneLink phone={phone} />` |
| `crm/booking-card.tsx:75-76` | `<p>{phone}</p>` | `<PhoneLink phone={phone} />` |
| `crm/booking-detail-sheet.tsx:91-92` | `<p>{phone}</p>` | `<PhoneLink phone={phone} />` |
| `inbox/conversation-context.tsx:67` | `<p>{phone}</p>` | `<PhoneLink phone={phone} />` |

## Component API

```tsx
<PhoneLink phone={string | null | undefined} className?: string />
```

## Architecture

- `src/components/shared/phone-link.tsx` — client component, uses `useTransition` + `callGuest` action
- Existing `callGuest()` in `src/server/ringostat/actions.ts` — no changes needed
- `InfoRow` in `bookings/[id]` may need to accept `ReactNode` as value (check current type)

## Out of scope

- Chat messages (inbox being built in parallel — PhoneLink will be dropped in when ready)
- Changing `callGuest()` logic
- New Ringostat API calls
