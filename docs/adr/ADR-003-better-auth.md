# ADR-003: Better-Auth over Clerk/NextAuth

**Date:** 2026-01-20
**Status:** Accepted
**Deciders:** Sergiy Korin, Claude Code

## Context

Auth is the foundation. Options evaluated: Clerk, NextAuth v5, Lucia v3, Better-Auth v1.5.

## Decision

**Better-Auth v1.5+**

## Evaluation

| Criteria | Clerk | NextAuth v5 | Lucia v3 | Better-Auth |
|---|---|---|---|---|
| Self-hosted | ❌ SaaS | ✅ | ✅ | ✅ |
| Prisma adapter | ✅ | ✅ | ✅ | ✅ built-in |
| Email+Password | ✅ | ✅ | manual | ✅ |
| Social providers | ✅ | ✅ | manual | ✅ |
| Cost at scale | $100+/mo | free | free | free |
| DX | excellent | good | verbose | good |
| Maintenance | Clerk team | community | solo | growing team |
| Session strategy | JWT/DB | JWT/DB | DB only | DB (default) |

## Rationale

- No SaaS dependency (Clerk would be $100+/mo at hotel scale)
- Better-Auth has Prisma adapter built-in → no separate account table management
- Better-Auth `@better-auth/utils/password` uses scrypt via `@noble/hashes` — auditable, modern
- Escape hatch: Lucia v3 (simpler, ~1 week migration if Better-Auth abandoned)

## Password Hashing Note

Better-Auth uses `@noble/hashes` scrypt with format: `salt:hex_encoded_hash`
**NOT** Node.js `crypto.scrypt` (format: `hex.salt`) — these are INCOMPATIBLE.
Seed must use `hashPassword` from `@better-auth/utils/password`.

## Account Model

```prisma
model Account {
  accountId  String  // = email for credential provider
  providerId String  // "credential" | "google" | "github"
  password   String? // scrypt hash, null for OAuth accounts
}
```

## Consequences

- All sessions stored in PostgreSQL (no JWT)
- Session invalidation is instant (DB delete)
- `BETTER_AUTH_SECRET` must be set in production env
- `BETTER_AUTH_URL` must match the actual app URL
