---
id: E5-S1
epic: E5
title: Three-layer tracking chart
status: done
constrained_by: [5edebac0-4371-4b0b-b574-45cc379a1c26, 7fb57986-c32c-4f27-8ee7-d850a27191ef]
depends_on: [E4-S3, E2-S4]
---

Chart component: Plan Forecast bands + actual Snapshot trajectory + re-forecast bands. Immersive, mobile-responsive.

## Done
`components/forecast-chart.tsx` (shared SVG) + `components/tracking-chart.tsx` overlay all three layers: Plan p10–p90 band + median, actual Snapshot trajectory (markers+line), re-forecast p10–p90 band + dashed median. Verified rendering on the dashboard.
