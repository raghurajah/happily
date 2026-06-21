---
id: E4-S3
epic: E4
title: Forecast comparison & active Plan
status: done
constrained_by: [2949f831-3153-4af4-9eaf-f33214f2dcdb]
depends_on: [E4-S2]
---

Overlay 2+ Forecasts; designate exactly one Scenario as the active Plan whose Forecast becomes the tracking baseline.

## Done
`setActivePlan` (transactional single-Plan + partial unique index) + `components/forecast-chart.tsx` (dependency-free SVG bands/lines/markers) + `/scenarios/compare` overlay. Verified: exactly one Plan (Base Plan); compare chart overlays Base 99.9% vs Spend More 27.3%.
