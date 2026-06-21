"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ScenarioAssumptions } from "@/db/schema";
import { db } from "@/db";
import { persons, scenarios } from "@/db/schema";
import { requireHousehold } from "@/lib/session";

const num = (v: FormDataEntryValue | null, fallback = 0): number => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
};

/** Build the full assumption set from the editor form. Percentages → decimals. */
function parseAssumptions(formData: FormData, personIds: string[]): ScenarioAssumptions {
  const retirementAges: Record<string, number> = {};
  for (const id of personIds) {
    retirementAges[id] = num(formData.get(`retire-${id}`), 65);
  }

  const withdrawalType = String(formData.get("withdrawalType") ?? "post_tax_first");
  let withdrawal: ScenarioAssumptions["withdrawal"];
  if (withdrawalType === "blend") {
    const controlPoints: Array<{ age: number; postTaxPct: number }> = [];
    for (let i = 0; i < 6; i++) {
      const ageRaw = formData.get(`blendAge-${i}`);
      const pctRaw = formData.get(`blendPct-${i}`);
      if (ageRaw && String(ageRaw).trim() !== "") {
        controlPoints.push({ age: num(ageRaw), postTaxPct: num(pctRaw) / 100 });
      }
    }
    withdrawal = { strategy: "blend", controlPoints };
  } else if (withdrawalType === "tax_deferred_first") {
    withdrawal = { strategy: "tax_deferred_first" };
  } else {
    withdrawal = { strategy: "post_tax_first" };
  }

  return {
    retirementAges,
    annualExpenses: num(formData.get("annualExpenses")),
    lifeExpectancy: num(formData.get("lifeExpectancy"), 92),
    returnMean: num(formData.get("returnMean")) / 100,
    returnSd: num(formData.get("returnSd")) / 100,
    inflationMean: num(formData.get("inflationMean")) / 100,
    inflationSd: num(formData.get("inflationSd")) / 100,
    tax: {
      filingStatus: String(formData.get("filingStatus")) === "single" ? "single" : "married_joint",
      stateRate: num(formData.get("stateRate")) / 100,
    },
    withdrawal,
  };
}

async function householdPersonIds(householdId: string): Promise<string[]> {
  const rows = await db.select({ id: persons.id }).from(persons).where(eq(persons.householdId, householdId));
  return rows.map((r) => r.id);
}

export async function createScenario(formData: FormData) {
  const { householdId } = await requireHousehold();
  const name = z.string().trim().min(1).parse(formData.get("name"));
  const ids = await householdPersonIds(householdId);
  const assumptions = parseAssumptions(formData, ids);
  const [created] = await db
    .insert(scenarios)
    .values({ householdId, name, assumptions })
    .returning();
  revalidatePath("/scenarios");
  return created.id;
}

export async function updateScenario(formData: FormData) {
  const { householdId } = await requireHousehold();
  const id = z.string().uuid().parse(formData.get("id"));
  const name = z.string().trim().min(1).parse(formData.get("name"));
  const ids = await householdPersonIds(householdId);
  const assumptions = parseAssumptions(formData, ids);
  await db
    .update(scenarios)
    .set({ name, assumptions })
    .where(and(eq(scenarios.id, id), eq(scenarios.householdId, householdId)));
  revalidatePath("/scenarios");
  revalidatePath(`/scenarios/${id}`);
}

export async function deleteScenario(formData: FormData) {
  const { householdId } = await requireHousehold();
  const id = z.string().uuid().parse(formData.get("id"));
  await db.delete(scenarios).where(and(eq(scenarios.id, id), eq(scenarios.householdId, householdId)));
  revalidatePath("/scenarios");
}

/**
 * Designate exactly one Scenario as the active Plan (decision 2949f831). The DB
 * partial unique index enforces single-Plan, so we clear the household's current
 * Plan and set the new one in one transaction to avoid a transient conflict.
 */
export async function setActivePlan(formData: FormData) {
  const { householdId } = await requireHousehold();
  const id = z.string().uuid().parse(formData.get("id"));
  await db.transaction(async (tx) => {
    await tx.update(scenarios).set({ isPlan: false }).where(eq(scenarios.householdId, householdId));
    await tx
      .update(scenarios)
      .set({ isPlan: true })
      .where(and(eq(scenarios.id, id), eq(scenarios.householdId, householdId)));
  });
  revalidatePath("/scenarios");
  revalidatePath(`/scenarios/${id}`);
  revalidatePath("/dashboard");
}
