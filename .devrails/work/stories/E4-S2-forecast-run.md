---
id: E4-S2
epic: E4
title: Run & freeze Forecasts
status: done
constrained_by: [2949f831-3153-4af4-9eaf-f33214f2dcdb, 71b1665b-2b3d-49f2-96ce-90884caf64db]
depends_on: [E4-S1, E3-S4]
---

Server-side engine invocation from a Scenario + starting balances; persist the frozen Forecast (bands, success curve, seed, input hash). Multiple Forecasts coexist.

## Done
`lib/forecast.ts` (engine-input adapter: starting balances from latest snapshot/manualValue, weighted nonDrawableGrowth) + `lib/actions/forecasts.ts` (runForecastAction: 10k trials, seed from sha256 input hash, frozen Forecast). Verified: forecast frozen (39y bands+curve, 99.9% success) in 389ms.
