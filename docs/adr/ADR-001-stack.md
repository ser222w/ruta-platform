# ADR-001: Technology Stack

**Date:** 2026-01-15
**Status:** Accepted
**Deciders:** Sergiy Korin (CEO/Product), Claude Code (Lead Dev)

## Context

Building an operational platform for RUTA Group (4 hotels, ~170 rooms). Single developer + AI. Must be maintainable by 1 person, deployable on self-hosted infra, and ship at 24h iteration cadence.

## Decisions

### Next.js App Router (not separate frontend/backend)
**Why:** Single deployment, file-based routing, React Server Components reduce client bundle. Escape hatch: TanStack Start if Next.js becomes too restrictive.

### tRPC + Hono (not REST or GraphQL)
**Why:** Type-safe API without codegen. Hono for webhooks/public endpoints where tRPC overhead is unnecessary. No GraphQL — overkill for single-team.

### Prisma 6 multi-file schema (not Drizzle)
**Why:** Better DX for schema exploration, `prisma studio` for ops, active ecosystem. Multi-file schema keeps domain models isolated. Escape: Drizzle ~2 weeks migration.

### Better-Auth (not Clerk or NextAuth)
**Why:** Self-hosted, no SaaS dependency, supports all providers, compatible with Prisma. Clerk adds $100+/month at scale.

### CASL (not Oso or custom)
**Why:** `@casl/prisma` generates Prisma `WHERE` clauses from ability definitions — eliminates manual scoping bugs. Declarative, testable.

### BullMQ + Redis (not Trigger.dev or cron jobs)
**Why:** Redis already needed for session/cache. BullMQ handles retries, delays, priorities. Self-hosted. Escape: Trigger.dev self-hosted.

### Tremor Raw copy-paste (not @tremor/react npm)
**Why:** Full control over chart styling without fighting library defaults. No version lock-in.

### Single Next.js monolith (not microservices)
**Why:** 1-person team. Microservices = 10x operational overhead. Escape hatch: extract services when team > 3 and specific service has independent scaling needs.

## Consequences

- All code in one repo, one deploy pipeline
- Type safety end-to-end (Prisma → tRPC → React)
- No SaaS runtime dependencies (self-hostable)
- Coolify on Hetzner handles all orchestration

## NOT USED (explicit excludes)
- Monorepo/Turborepo: overhead for 1 developer
- GraphQL: tRPC is sufficient and simpler
- Chatwoot: build own inbox (full control over UI/UX)
- Supabase: self-host everything
- Metabase: Tremor Raw inline dashboards
- @tremor/react npm: copy-paste for control
