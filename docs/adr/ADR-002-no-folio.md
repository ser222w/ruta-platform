# ADR-002: No Folio Entity

**Date:** 2026-02-10
**Status:** Accepted
**Deciders:** Sergiy Korin, Claude Code

## Context

Traditional PMS systems (Opera, Servio, Odoo) use a "Folio" entity as a financial container per guest stay — a ledger of charges and payments. The question: do we replicate this pattern?

## Decision

**No separate Folio entity.**

Charges and payments are inline in Booking. Settlement is a computed value, not stored.

```
settlement = sum(charges) - sum(payments WHERE status = SUCCEEDED)
```

### Models affected
- `PaymentScheduleLine` — linked to `Booking.id`
- `SaleOrder` — linked to `Booking.id`
- No `Folio` table anywhere in schema

## Rationale

1. **RUTA booking = 1 guest group, 1 stay** — no split billing, no shared folios (unlike hotel groups)
2. **Fewer joins** — every settlement query is Booking → Charges + Payments, not Booking → Folio → Charges
3. **Simpler mental model** — managers see one entity, not Booking + its Folio
4. **Accounting export** — CSV export to 1C handles edge cases without a Folio abstraction

## Consequences

- Settlement must be recomputed (not cached) — acceptable for current scale
- If RUTA ever needs split billing (corporate accounts, multiple payers), will need to add Payer/Folio then
- `SaleOrder` handles corporate billing for юрособа via `Booking.payerId`

## Escape Hatch

Add `Folio` model as a wrapper around `PaymentScheduleLine` + `SaleOrder` queries. Migration: 1-2 days.
