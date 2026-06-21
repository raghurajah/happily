"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { Availability } from "@/db/schema";
import { db } from "@/db";
import { contributions, incomeStreams } from "@/db/schema";
import { requireHousehold } from "@/lib/session";

/** Build the availability JSON from a single range + optional excluded years. */
function buildAvailability(formData: FormData): Availability {
  const startYear = Number(formData.get("startYear"));
  const endRaw = formData.get("endYear");
  const endYear = endRaw && String(endRaw).trim() !== "" ? Number(endRaw) : null;
  const excludeYears = String(formData.get("excludeYears") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return { ranges: [{ startYear, endYear }], excludeYears };
}

// --- Income streams -------------------------------------------------------

const streamSchema = z
  .object({
    name: z.string().trim().min(1),
    ownerKind: z.enum(["person", "asset"]),
    personId: z.string().uuid().nullable(),
    assetId: z.string().uuid().nullable(),
    annualAmount: z.coerce.number().min(0),
    cola: z.boolean(),
    startYear: z.coerce.number().int().min(1900).max(2200),
  })
  .refine((v) => (v.ownerKind === "person" ? v.personId : v.assetId), {
    message: "Pick the person or asset the stream attaches to",
  });

function parseStream(formData: FormData) {
  const ownerKind = String(formData.get("ownerKind")) as "person" | "asset";
  return streamSchema.parse({
    name: formData.get("name"),
    ownerKind,
    personId: ownerKind === "person" ? formData.get("ownerId") || null : null,
    assetId: ownerKind === "asset" ? formData.get("ownerId") || null : null,
    annualAmount: formData.get("annualAmount"),
    cola: formData.get("cola") === "on",
    startYear: formData.get("startYear"),
  });
}

export async function addStream(formData: FormData) {
  const { householdId } = await requireHousehold();
  const v = parseStream(formData);
  await db.insert(incomeStreams).values({
    householdId,
    name: v.name,
    ownerKind: v.ownerKind,
    personId: v.personId,
    assetId: v.assetId,
    annualAmount: String(v.annualAmount),
    cola: v.cola,
    availability: buildAvailability(formData),
  });
  revalidatePath("/household");
}

export async function deleteStream(formData: FormData) {
  const { householdId } = await requireHousehold();
  const id = z.string().uuid().parse(formData.get("id"));
  await db
    .delete(incomeStreams)
    .where(and(eq(incomeStreams.id, id), eq(incomeStreams.householdId, householdId)));
  revalidatePath("/household");
}

// --- Contributions --------------------------------------------------------

const contributionSchema = z.object({
  name: z.string().trim().min(1),
  personId: z.string().uuid(),
  annualAmount: z.coerce.number().min(0),
  targetBucket: z.enum(["post_tax", "tax_deferred"]),
  startYear: z.coerce.number().int().min(1900).max(2200),
});

export async function addContribution(formData: FormData) {
  const { householdId } = await requireHousehold();
  const v = contributionSchema.parse({
    name: formData.get("name"),
    personId: formData.get("personId"),
    annualAmount: formData.get("annualAmount"),
    targetBucket: formData.get("targetBucket"),
    startYear: formData.get("startYear"),
  });
  await db.insert(contributions).values({
    householdId,
    personId: v.personId,
    name: v.name,
    annualAmount: String(v.annualAmount),
    targetBucket: v.targetBucket,
    availability: buildAvailability(formData),
  });
  revalidatePath("/household");
}

export async function deleteContribution(formData: FormData) {
  const { householdId } = await requireHousehold();
  const id = z.string().uuid().parse(formData.get("id"));
  await db
    .delete(contributions)
    .where(and(eq(contributions.id, id), eq(contributions.householdId, householdId)));
  revalidatePath("/household");
}
