---
id: E6-S3
epic: E6
title: Position storage per sync
status: done
constrained_by: [99d5cbfb-7010-4c0d-b63c-eb26f323fe00, b1ee4eca-d743-468a-bff3-9032adb66a1c]
depends_on: [E6-S2]
---

Fetch and store position-level holdings alongside each Snapshot for later attribution/allocation.

## Done (code-complete)
`positions` table + per-sync position storage sharing the snapshot batchId. `parsePositions` unit-tested. Quantity/marketValue/costBasis per holding.
