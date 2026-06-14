import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { forecasts } from "@/db/schema";

export type ForecastRow = typeof forecasts.$inferSelect;

/** Latest Forecast per scenario for a household (most recent run wins). */
export async function latestForecastByScenario(householdId: string): Promise<Map<string, ForecastRow>> {
  const rows = await db
    .select()
    .from(forecasts)
    .where(eq(forecasts.householdId, householdId))
    .orderBy(desc(forecasts.createdAt));
  const byScenario = new Map<string, ForecastRow>();
  for (const r of rows) if (!byScenario.has(r.scenarioId)) byScenario.set(r.scenarioId, r);
  return byScenario;
}

export function forecastSuccess(f: ForecastRow): number {
  const fromInputs = (f.startingInputs as { successProbability?: number }).successProbability;
  return Number(fromInputs ?? f.successCurve.at(-1)?.probability ?? 0);
}
