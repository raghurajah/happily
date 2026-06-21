---
id: E7-S2
epic: E7
title: Allocation vs target & drift
status: done
constrained_by: [99d5cbfb-7010-4c0d-b63c-eb26f323fe00]
depends_on: [E6-S3]
---

Classify holdings into asset classes, current allocation, user-set target allocation, drift display.

## Done
`lib/insight/allocation.ts` (symbol→class map, drift) + household.targetAllocation jsonb + `/allocation` page + nav entry. Verified: US Equity 57.3% vs 50% (+7.3%), Intl 12.3% vs 20% (−7.7%), Bonds 30.4% vs 30%.
