---
id: E2-S4
epic: E2
title: Manual entry & CSV import to Snapshots
status: done
constrained_by: [b1ee4eca-d743-468a-bff3-9032adb66a1c, db09d3a5-bc04-4d0b-b174-908272d9ec2e]
depends_on: [E2-S2]
---

Manual balance entry and CSV import of E*TRADE website exports; both persist dated append-only Snapshots. This is the bridge while the production API key is pending.

## Done
`lib/csv.ts` (tolerant parser, 5 tests) + `lib/actions/snapshots.ts` + `components/csv-import.tsx`. Manual multi-asset batch entry + CSV import → dated append-only Snapshots (batchId, source). Name-match w/ skip report. Verified: manual batch (3) + csv batch (2 matched, 1 skipped).
