---
id: E1-S2
epic: E1
title: Drizzle schema & migrations
status: todo
constrained_by: [d8fa123f-dc72-40a2-8cfa-45a18035261d, 2949f831-3153-4af4-9eaf-f33214f2dcdb, c9da4675-a747-4290-95bc-7e3a26ba4352, b6012bc6-6a57-419c-87b1-b7f0114dc825, a5edec0f-b0d8-40a5-8107-2cbf2323161c, b1ee4eca-d743-468a-bff3-9032adb66a1c]
depends_on: [E1-S1]
---

Drizzle + drizzle-kit setup; tables: users, households, persons, assets (kind, bucket, ownership), snapshots (append-only), income_streams (person-or-asset attachment, year availability), contributions (per-year toggles), scenarios, forecasts. Migrations run on deploy.
