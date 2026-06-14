---
id: E2-S3
epic: E2
title: Income streams & contributions
status: done
constrained_by: [b6012bc6-6a57-419c-87b1-b7f0114dc825]
depends_on: [E2-S1]
---

Streams attach to a person or an asset: amount in today's dollars, COLA flag, year-level availability (ranges/exclusions). Contributions per person with per-year enable/disable.

## Done
`lib/actions/streams.ts` + `components/stream-form.tsx` + Household sections. Streams attach to person|asset, amount/COLA/availability; contributions to a person w/ target bucket + availability. Verified: SS(person,COLA,2036+), 401k(tax_deferred,2026-2033).
