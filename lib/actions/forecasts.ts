"use server";

import { createHash } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { forecasts, scenarios } from "@/db/schema";
import { runForecast } from "@/lib/engine";
import { buildEngineInput } from "@/lib/forecast";
import { requireHousehold } from "@/lib/session";

const TRIALS = 10_000;

/** Deterministic numeric seed from the resolved engine input (frozen-Forecast reproducibility). */
function seedFrom(inputHash: string): number {
  return parseInt(inputHash.slice(0, 8), 16) >>> 0;
}

/**
 * Run the engine for a Scenario from today's starting balances and FREEZE the
 * result as a Forecast (decision 2949f831): bands, success curve, the seed, an
 * input hash (to detect staleness), and the resolved inputs. Multiple Forecasts
 * for a Scenario coexist — each is a point-in-time snapshot.
 */
export async function runForecastAction(formData: FormData) {
  const { householdId } = await requireHousehold();
  const scenarioId = z.string().uuid().parse(formData.get("scenarioId"));

  const scenario = (
    await db
      .select()
      .from(scenarios)
      .where(and(eq(scenarios.id, scenarioId), eq(scenarios.householdId, householdId)))
  )[0];
  if (!scenario) throw new Error("Scenario not found");

  const startYear = new Date().getFullYear();
  const { engineInput, startingBalances } = await buildEngineInput(householdId, scenario, startYear);

  const inputHash = createHash("sha256").update(JSON.stringify(engineInput)).digest("hex");
  const seed = seedFrom(inputHash);
  const result = runForecast(engineInput, { trials: TRIALS, seed });

  await db.insert(forecasts).values({
    scenarioId,
    householdId,
    seed: String(seed),
    inputHash,
    bands: result.bands,
    successCurve: result.successCurve,
    startingInputs: {
      startYear,
      startingBalances,
      successProbability: result.successProbability,
      trials: TRIALS,
      annualExpenses: engineInput.annualExpenses,
    },
  });

  revalidatePath(`/scenarios/${scenarioId}`);
  revalidatePath("/scenarios");
}

export async function deleteForecast(formData: FormData) {
  const { householdId } = await requireHousehold();
  const id = z.string().uuid().parse(formData.get("id"));
  const scenarioId = String(formData.get("scenarioId") ?? "");
  await db.delete(forecasts).where(and(eq(forecasts.id, id), eq(forecasts.householdId, householdId)));
  if (scenarioId) revalidatePath(`/scenarios/${scenarioId}`);
}
