---
id: E6-S2
epic: E6
title: Balance sync to Snapshots
status: done
constrained_by: [db09d3a5-bc04-4d0b-b174-908272d9ec2e, 8a2f4e15-3426-4636-b08d-cc5ea42b6265, b1ee4eca-d743-468a-bff3-9032adb66a1c]
depends_on: [E6-S1, E2-S4]
---

Fetch accounts + balances, map E*TRADE accounts to Assets (one bucket each), persist Snapshot; manual sync button and sync-on-open; stale-since banner and one-tap reconnect.

## Done (code-complete; live sync pending credentials)
`syncNow` action: list accounts → find/create synced asset per account (bucket via mapping.ts) → dated Snapshot batch (source=etrade). Manual "Sync now" button. Parsers + mapping unit-tested (11 tests total). Insert path mirrors the verified manual/CSV snapshot path.
