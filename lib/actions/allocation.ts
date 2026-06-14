"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import type { TargetAllocation } from "@/db/schema";
import { db } from "@/db";
import { households } from "@/db/schema";
import type { AssetClass } from "@/lib/insight/allocation";
import { requireHousehold } from "@/lib/session";

const CLASSES: AssetClass[] = ["us_equity", "intl_equity", "bonds", "cash", "real_estate", "other"];

/** Save the user's target allocation. Inputs are percentages; stored as fractions. */
export async function setTargetAllocation(formData: FormData) {
  const { householdId } = await requireHousehold();
  const target: TargetAllocation = {};
  for (const c of CLASSES) {
    const raw = formData.get(`target-${c}`);
    const pct = Number(String(raw ?? "").trim());
    if (Number.isFinite(pct) && pct > 0) target[c] = pct / 100;
  }
  await db.update(households).set({ targetAllocation: target }).where(eq(households.id, householdId));
  revalidatePath("/allocation");
}
