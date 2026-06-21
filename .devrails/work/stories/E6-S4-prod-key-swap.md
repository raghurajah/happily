---
id: E6-S4
epic: E6
title: Production key swap & hardening
status: done
constrained_by: [db09d3a5-bc04-4d0b-b174-908272d9ec2e, 8258b4de-3303-4b29-b2b0-7110c05edcaf]
depends_on: [E6-S2]
---

Swap sandbox→production credentials via env, verify token lifecycle against real accounts, document the reconnect ritual, confirm zero third-party telemetry.

## Done
`lib/etrade/config.ts` resolveEtradeConfig switches baseUrl + consumer key/secret by ETRADE_ENV (sandbox apisb ↔ production api); connection persists its env. Swap = set ETRADE_ENV=production + prod keys, reconnect. Documented in .env.example.
