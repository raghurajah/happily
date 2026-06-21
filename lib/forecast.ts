/**
 * Adapter from persisted household state + a Scenario to the pure engine's
 * EngineInput (E4-S2). Starting balances come from each asset's latest Snapshot,
 * falling back to a manual asset's hand-entered value. This is the I/O boundary;
 * the engine itself stays pure.
 */
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { assets, contributions, incomeStreams, persons, scenarios, snapshots } from "@/db/schema";
import type { Bucket, EngineInput } from "@/lib/engine";

type ScenarioRow = typeof scenarios.$inferSelect;

export interface ResolvedForecastInput {
  engineInput: EngineInput;
  startingBalances: Record<Bucket, number>;
}

/** Latest snapshot balance per asset (by as_of), used as the live starting value. */
function latestBalances(snaps: (typeof snapshots.$inferSelect)[]): Map<string, number> {
  const byAsset = new Map<string, { balance: number; asOf: Date }>();
  for (const s of snaps) {
    const cur = byAsset.get(s.assetId);
    if (!cur || s.asOf > cur.asOf) byAsset.set(s.assetId, { balance: Number(s.balance), asOf: s.asOf });
  }
  return new Map([...byAsset].map(([k, v]) => [k, v.balance]));
}

export async function buildEngineInput(
  householdId: string,
  scenario: ScenarioRow,
  startYear: number,
): Promise<ResolvedForecastInput> {
  const a = scenario.assumptions;
  const [people, assetRows, streamRows, contribRows] = await Promise.all([
    db.select().from(persons).where(eq(persons.householdId, householdId)),
    db.select().from(assets).where(eq(assets.householdId, householdId)),
    db.select().from(incomeStreams).where(eq(incomeStreams.householdId, householdId)),
    db.select().from(contributions).where(eq(contributions.householdId, householdId)),
  ]);
  const assetIds = assetRows.map((r) => r.id);
  const snaps = assetIds.length
    ? await db.select().from(snapshots).where(inArray(snapshots.assetId, assetIds))
    : [];
  const latest = latestBalances(snaps);

  // Aggregate starting balances per bucket: latest snapshot, else manual value.
  const startingBalances: Record<Bucket, number> = { post_tax: 0, tax_deferred: 0, non_drawable: 0 };
  let ndWeightedGrowth = 0;
  let ndTotal = 0;
  for (const asset of assetRows) {
    const value = latest.get(asset.id) ?? (asset.manualValue !== null ? Number(asset.manualValue) : 0);
    startingBalances[asset.bucket] += value;
    if (asset.bucket === "non_drawable" && asset.growthRate !== null) {
      ndWeightedGrowth += value * Number(asset.growthRate);
      ndTotal += value;
    }
  }
  const nonDrawableGrowth = ndTotal > 0 ? ndWeightedGrowth / ndTotal : 0;

  const engineInput: EngineInput = {
    startYear,
    persons: people.map((p) => ({
      id: p.id,
      birthYear: p.birthYear,
      retirementAge: a.retirementAges[p.id] ?? 65,
    })),
    lifeExpectancy: a.lifeExpectancy,
    startingBalances,
    nonDrawableGrowth,
    annualExpenses: a.annualExpenses,
    returnMean: a.returnMean,
    returnSd: a.returnSd,
    inflationMean: a.inflationMean,
    inflationSd: a.inflationSd,
    tax: { filingStatus: a.tax.filingStatus, stateRate: a.tax.stateRate },
    withdrawal: mapWithdrawal(a.withdrawal),
    incomeStreams: streamRows.map((s) => ({
      id: s.id,
      annualAmount: Number(a.streamOverrides?.[s.id] ?? s.annualAmount),
      cola: s.cola,
      availability: s.availability,
    })),
    contributions: contribRows.map((c) => ({
      id: c.id,
      annualAmount: Number(a.contributionOverrides?.[c.id] ?? c.annualAmount),
      targetBucket: c.targetBucket as "post_tax" | "tax_deferred",
      availability: c.availability,
    })),
  };

  return { engineInput, startingBalances };
}

function mapWithdrawal(w: ScenarioRow["assumptions"]["withdrawal"]): EngineInput["withdrawal"] {
  if (w.strategy === "blend") return { type: "blend", controlPoints: w.controlPoints };
  if (w.strategy === "tax_deferred_first") return { type: "tax_deferred_first" };
  return { type: "post_tax_first" };
}
