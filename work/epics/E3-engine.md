---
id: E3
title: Simulation engine
release: R1
status: planned
constrained_by: [71b1665b-2b3d-49f2-96ce-90884caf64db, 913da4c1-f27f-4d4d-9b74-a649de94201e, 9032d3c9-7f48-495f-bd84-8e10469fc851, 9a5db500-80e4-4a0c-9363-109e16f88687, b10161a1-1af5-4ddc-8bdd-1395049518e0, 5c68ced9-f9f3-4bb0-adf5-bf0524cc8156, 10d3df55-1349-41e1-9ccc-d6bb543c7106, e49729f7-1d65-4d70-bb3c-05c4f3e239d8]
depends_on: [E1]
---

The pure, deterministic Monte Carlo engine: annual household simulation with normal return/inflation draws, federal-bracket + flat-state tax, RMDs, three withdrawal strategies including the blend schedule, 10k trials reduced to percentile bands and per-age success probability. No I/O; heavily unit-tested; differences vs the legacy Excel explained in tests' fixtures.
