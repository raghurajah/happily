---
id: E3-S3
epic: E3
title: Withdrawal strategies
status: done
constrained_by: [5c68ced9-f9f3-4bb0-adf5-bf0524cc8156]
depends_on: [E3-S2]
---

post-tax-first, tax-deferred-first, and blend schedule (time-keyed % control points); RMD floor under all strategies; income streams and contributions applied with year availability.

## Done
`lib/engine/strategy.ts` — post-tax-first, tax-deferred-first, blend (age-interpolated control points w/ spillover); RMD floor binds under all; streams/contributions availability verified. 7 tests.
