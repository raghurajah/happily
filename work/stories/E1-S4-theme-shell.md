---
id: E1-S4
epic: E1
title: Theme tokens & responsive app shell
status: done
constrained_by: [7fb57986-c32c-4f27-8ee7-d850a27191ef]
depends_on: [E1-S1]
---

Tailwind theme: near-black base, deep-maroon accent (tuned for contrast), data-dense typography; responsive shell + nav that works on mobile browsers.

## Done

- `app/globals.css`: Tailwind v4 `@theme` tokens — near-black surfaces (base/surface/elevated/line), deep-maroon accent (`#c0344e` + strong/dim, AA-tuned on near-black), up/down financial colors, `.tnum` tabular-mono figures.
- `app/layout.tsx`: Happily metadata, dark color-scheme viewport theme.
- `components/app-shell.tsx`: responsive shell — desktop sidebar nav + mobile top bar & fixed bottom nav, active-link highlighting via `usePathname`.
- `lib/nav.ts`: R1 nav (Dashboard, Scenarios, Assets, Household); Allocation deferred to E7.
- Route group `app/(app)/` with `AppShell` layout + themed placeholder pages; `/` redirects to `/dashboard`. `components/page-header.tsx` primitives.
- Verified: `pnpm build` clean; rendered at 1280px (sidebar) and 390px (bottom nav) — both correct.
