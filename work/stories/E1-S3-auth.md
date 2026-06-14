---
id: E1-S3
epic: E1
title: Auth.js login & member seeding
status: done
constrained_by: [c1c6e5f9-b474-4250-8f55-d546107124dd]
depends_on: [E1-S2]
---

Auth.js (NextAuth v5) credentials provider, session cookies, closed membership seeded at setup, every route gated. No signup.

## Done

- `lib/password.ts` (bcryptjs hash/verify), `auth.config.ts` (edge-safe gate, JWT session w/ id+householdId), `auth.ts` (Credentials provider, zod-validated, DB lookup).
- `proxy.ts` (Next 16 proxy = former middleware) gates all routes via `authorized`; `(app)/layout.tsx` re-checks session (defense in depth) and passes user to AppShell with a sign-out form (`lib/actions/auth.ts`).
- `app/api/auth/[...nextauth]/route.ts`, `app/login/page.tsx` (server-action login), `types/next-auth.d.ts`, shared `components/ui.tsx` primitives.
- `scripts/seed.ts` + `db:seed` — closed membership, idempotent on email.
- Verified end-to-end on a real local Postgres: unauth `/dashboard` → 307 `/login`; seeded member signs in → gated dashboard renders with the user. Decision seeded (build-originated).
