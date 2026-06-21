"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { assetOwners, assets } from "@/db/schema";
import { requireHousehold } from "@/lib/session";

const assetSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    kind: z.enum(["synced", "manual"]),
    bucket: z.enum(["post_tax", "tax_deferred", "non_drawable"]),
    manualValue: z.coerce.number().min(0).nullable(),
    growthRate: z.coerce.number().nullable(),
    ownerIds: z.array(z.string().uuid()),
  })
  .refine((v) => v.kind === "synced" || v.manualValue !== null, {
    message: "Manual assets need a current value",
    path: ["manualValue"],
  });

function parseForm(formData: FormData) {
  return assetSchema.parse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    bucket: formData.get("bucket"),
    manualValue: formData.get("manualValue") || null,
    growthRate: formData.get("growthRate") || null,
    // Multiple checkboxes share the name "ownerIds".
    ownerIds: formData.getAll("ownerIds").map(String),
  });
}

export async function addAsset(formData: FormData) {
  const { householdId } = await requireHousehold();
  const v = parseForm(formData);
  const [asset] = await db
    .insert(assets)
    .values({
      householdId,
      name: v.name,
      kind: v.kind,
      bucket: v.bucket,
      manualValue: v.kind === "manual" && v.manualValue !== null ? String(v.manualValue) : null,
      growthRate: v.kind === "manual" && v.growthRate !== null ? String(v.growthRate) : null,
    })
    .returning();
  if (v.ownerIds.length) {
    await db.insert(assetOwners).values(v.ownerIds.map((personId) => ({ assetId: asset.id, personId })));
  }
  revalidatePath("/assets");
}

export async function updateAsset(formData: FormData) {
  const { householdId } = await requireHousehold();
  const id = z.string().uuid().parse(formData.get("id"));
  const v = parseForm(formData);
  await db
    .update(assets)
    .set({
      name: v.name,
      kind: v.kind,
      bucket: v.bucket,
      manualValue: v.kind === "manual" && v.manualValue !== null ? String(v.manualValue) : null,
      growthRate: v.kind === "manual" && v.growthRate !== null ? String(v.growthRate) : null,
    })
    .where(and(eq(assets.id, id), eq(assets.householdId, householdId)));
  // Replace ownership set.
  await db.delete(assetOwners).where(eq(assetOwners.assetId, id));
  if (v.ownerIds.length) {
    await db.insert(assetOwners).values(v.ownerIds.map((personId) => ({ assetId: id, personId })));
  }
  revalidatePath("/assets");
}

export async function deleteAsset(formData: FormData) {
  const { householdId } = await requireHousehold();
  const id = z.string().uuid().parse(formData.get("id"));
  await db.delete(assets).where(and(eq(assets.id, id), eq(assets.householdId, householdId)));
  revalidatePath("/assets");
}
