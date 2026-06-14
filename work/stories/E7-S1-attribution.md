---
id: E7-S1
epic: E7
title: Holdings attribution
status: done
constrained_by: [99d5cbfb-7010-4c0d-b63c-eb26f323fe00]
depends_on: [E6-S3]
---

Diff consecutive position Snapshots to attribute balance moves to individual holdings (price change vs flows); 'what moved my number' view.

## Done
`lib/insight/attribution.ts` (price-vs-flow decomposition, 4 tests) + `queries.ts` (diff two latest position batches) + "What moved my number" on Assets. Verified with seeded batches: +$155,800 = $123,600 price + $32,200 flow, correct per-holding.
