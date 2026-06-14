---
id: E2-S2
epic: E2
title: Assets CRUD with buckets & ownership
status: done
constrained_by: [a5edec0f-b0d8-40a5-8107-2cbf2323161c, 8a2f4e15-3426-4636-b08d-cc5ea42b6265]
depends_on: [E2-S1]
---

Assets: synced (E*TRADE-backed, unlinked until R2) and manual kinds; bucket = post-tax | tax-deferred | non-drawable; ownership by one or more persons; optional growth assumption on manual assets.

## Done
`lib/actions/assets.ts` + `components/asset-form.tsx` (manual/synced toggle) + Assets page. Kind/bucket/ownership(join)/manualValue/growthRate; synced placeholder unlinked until R2. Verified: Brokerage(post_tax,both), IRA(tax_deferred,Raghu), Home(non_drawable,both,3%).
