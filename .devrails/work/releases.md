# Happily — release sequencing

Releases are cuts of the story dependency DAG: nothing in a release depends on work in a later release.

## Status (2026-06-14)
All 25 stories `done`. R1 fully built + verified end-to-end on a local Postgres (auth → household/assets/streams CRUD → manual+CSV snapshots → engine → scenarios/forecasts/plan → tracking dashboard). R2 (E*TRADE) and R3 (insight) are code-complete with unit-tested pure logic; the E*TRADE live OAuth handshake/sync is unverified pending real developer credentials (the external long pole). Two external hand-offs remain: provision Railway (E1-S1) and obtain the E*TRADE production key (E6-S4).

## R1 — Plan & Track (manual data)
Epics: E1 foundation, E2 domain-data, E3 engine, E4 scenarios, E5 dashboard.
Outcome: Happily fully replaces the Excel — household modeled, balances via manual entry / CSV import, improved Monte Carlo engine, Scenarios -> Forecasts -> active Plan, three-layer tracking dashboard. Usable end-to-end with no E*TRADE key.
Sequencing inside R1: E1 first (E1-S1 unblocks everything); E3 (pure engine) runs in parallel with E2 from E1-S1 onward; E4 needs E2-S3 + E3-S4; E5 closes the release.

## R2 — Connected
Epics: E6 etrade-sync.
Outcome: balances and positions sync via interactive user-present OAuth (sandbox first; production key swapped in via E6-S4 when E*TRADE grants it). Start the production key application at R1 kickoff — it is the external long pole.

## R3 — Insight
Epics: E7 insight.
Outcome: holdings attribution, allocation vs target, drift, simple rebalancing suggestions — consumes the position history R2 starts collecting (the sooner R2 ships, the more history R3 has to chew on).
