/**
 * Tracking analytics (decisions 5edebac0, 2b3012b4): the three layers behind the
 * dashboard chart.
 *   1. Plan bands     — the active Plan's frozen Forecast percentile bands.
 *   2. Actual         — net-worth trajectory from dated Snapshots, plus the
 *                       "achieved percentile" (where today's total falls in the
 *                       Plan's distribution for today).
 *   3. Re-forecast    — fresh Monte Carlo seeded from today's ACTUAL balances
 *                       under the Plan's assumptions, forward from now.
 */
import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { assets, forecasts, scenarios, snapshots, type ForecastBand } from "@/db/schema";
import { runForecast, type Bucket } from "@/lib/engine";
import { buildEngineInput } from "@/lib/forecast";
import { achievedPercentile, decimalYear } from "@/lib/tracking-math";

export interface TrackingData {
  hasPlan: boolean;
  planName?: string;
  planForecastBands?: ForecastBand[];
  /** Forward bands from a re-run seeded with today's actual balances. */
  reforecastBands?: ForecastBand[];
  /** Net-worth points from Snapshots: { year (decimal), netWorth }. */
  actualTrajectory: { year: number; netWorth: number }[];
  netWorthByBucket: Record<Bucket, number>;
  netWorth: number;
  /** Where today's net worth falls in the Plan's distribution for the current year (0–100). */
  achievedPercentile?: number;
  /** Headline: success probability of the re-forecast from current actuals. */
  reforecastSuccess?: number;
  /** Days since the most recent Snapshot (staleness), or null if none. */
  staleDays: number | null;
}

const EMPTY_BUCKETS: Record<Bucket, number> = { post_tax: 0, tax_deferred: 0, non_drawable: 0 };

export async function buildTrackingData(householdId: string): Promise<TrackingData> {
  const plan = (
    await db
      .select()
      .from(scenarios)
      .where(and(eq(scenarios.householdId, householdId), eq(scenarios.isPlan, true)))
  )[0];

  // Net worth + actual trajectory come from assets/snapshots regardless of a Plan.
  const assetRows = await db.select().from(assets).where(eq(assets.householdId, householdId));
  const assetIds = assetRows.map((a) => a.id);
  const snaps = assetIds.length
    ? await db.select().from(snapshots).where(inArray(snapshots.assetId, assetIds))
    : [];

  const manualOf = new Map(assetRows.map((a) => [a.id, a.manualValue !== null ? Number(a.manualValue) : 0]));

  // Current net worth by bucket: latest snapshot per asset, else manual value.
  const latest = new Map<string, { balance: number; asOf: Date }>();
  for (const s of snaps) {
    const cur = latest.get(s.assetId);
    if (!cur || s.asOf > cur.asOf) latest.set(s.assetId, { balance: Number(s.balance), asOf: s.asOf });
  }
  const netWorthByBucket = { ...EMPTY_BUCKETS };
  for (const a of assetRows) {
    const value = latest.get(a.id)?.balance ?? manualOf.get(a.id) ?? 0;
    netWorthByBucket[a.bucket] += value;
  }
  const netWorth = netWorthByBucket.post_tax + netWorthByBucket.tax_deferred + netWorthByBucket.non_drawable;

  // Actual trajectory: net worth carried forward at each distinct snapshot date.
  const dates = [...new Set(snaps.map((s) => s.asOf.getTime()))].sort((a, b) => a - b);
  const actualTrajectory = dates.map((t) => {
    const asOf = new Date(t);
    let nw = 0;
    for (const a of assetRows) {
      const upTo = snaps
        .filter((s) => s.assetId === a.id && s.asOf.getTime() <= t)
        .sort((x, y) => y.asOf.getTime() - x.asOf.getTime())[0];
      nw += upTo ? Number(upTo.balance) : (manualOf.get(a.id) ?? 0);
    }
    return { year: decimalYear(asOf), netWorth: nw };
  });

  const staleDays =
    dates.length > 0 ? Math.floor((Date.now() - dates[dates.length - 1]) / 86_400_000) : null;

  if (!plan) {
    return { hasPlan: false, actualTrajectory, netWorthByBucket, netWorth, staleDays };
  }

  const planForecast = (
    await db
      .select()
      .from(forecasts)
      .where(eq(forecasts.scenarioId, plan.id))
      .orderBy(desc(forecasts.createdAt))
      .limit(1)
  )[0];

  // Re-forecast forward from today's actual balances under the Plan's assumptions.
  const currentYear = new Date().getFullYear();
  const { engineInput } = await buildEngineInput(householdId, plan, currentYear);
  const reforecast = runForecast(engineInput, { trials: 10_000, seed: 424242 });

  // Achieved percentile: today's net worth vs the Plan band for the current year.
  let achieved: number | undefined;
  if (planForecast) {
    const band =
      planForecast.bands.find((b) => b.year === currentYear) ?? planForecast.bands[0];
    if (band) achieved = achievedPercentile(band, netWorth);
  }

  return {
    hasPlan: true,
    planName: plan.name,
    planForecastBands: planForecast?.bands,
    reforecastBands: reforecast.bands,
    actualTrajectory,
    netWorthByBucket,
    netWorth,
    achievedPercentile: achieved,
    reforecastSuccess: reforecast.successProbability,
    staleDays,
  };
}
