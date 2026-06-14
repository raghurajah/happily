"use server";

import { randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { assets, snapshots } from "@/db/schema";
import { parseBalanceCsv } from "@/lib/csv";
import { requireHousehold } from "@/lib/session";

/** Parse an `as_of` date input (yyyy-mm-dd), defaulting to now. App layer — Date is fine.
 *  Date-only values are anchored to local noon so the stored day doesn't shift across
 *  the UTC boundary (a plain `new Date("2026-06-13")` is UTC midnight = the prior evening locally). */
function parseAsOf(formData: FormData): Date {
  const raw = String(formData.get("asOf") ?? "").trim();
  if (!raw) return new Date();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00`) : new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Manual balance entry: one dated, append-only Snapshot batch across any assets
 * for which a balance was provided (decision b1ee4eca).
 */
export async function recordBalances(formData: FormData) {
  const { householdId } = await requireHousehold();
  const asOf = parseAsOf(formData);
  const owned = await db.select().from(assets).where(eq(assets.householdId, householdId));

  const batchId = randomUUID();
  const rows: { assetId: string; balance: string; asOf: Date; source: "manual"; batchId: string }[] = [];
  for (const a of owned) {
    const raw = formData.get(`balance-${a.id}`);
    if (raw === null || String(raw).trim() === "") continue;
    const n = Number(String(raw).replace(/[$,\s]/g, ""));
    if (!Number.isFinite(n)) continue;
    rows.push({ assetId: a.id, balance: String(n), asOf, source: "manual", batchId });
  }
  if (rows.length > 0) await db.insert(snapshots).values(rows);
  revalidatePath("/assets");
}

export interface ImportState {
  ok: boolean;
  imported: number;
  skipped: string[];
  error?: string;
}

/** Match a parsed CSV account label to one of the household's assets, by name. */
function matchAsset(account: string, owned: { id: string; name: string }[]): string | undefined {
  const a = account.toLowerCase().trim();
  const exact = owned.find((o) => o.name.toLowerCase().trim() === a);
  if (exact) return exact.id;
  const contains = owned.find(
    (o) => a.includes(o.name.toLowerCase().trim()) || o.name.toLowerCase().trim().includes(a),
  );
  return contains?.id;
}

/**
 * CSV import of an E*TRADE website export → a dated Snapshot batch. Rows whose
 * account can't be matched to an asset are reported as skipped (not an error).
 */
export async function importBalancesCsv(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  try {
    const { householdId } = await requireHousehold();
    const text = z.string().min(1, "Paste CSV content first").parse(formData.get("csv"));
    const asOf = parseAsOf(formData);
    const owned = await db.select().from(assets).where(eq(assets.householdId, householdId));

    const { rows, warnings } = parseBalanceCsv(text);
    if (rows.length === 0) {
      return { ok: false, imported: 0, skipped: [], error: warnings[0] ?? "No rows parsed" };
    }

    const batchId = randomUUID();
    const toInsert: { assetId: string; balance: string; asOf: Date; source: "csv"; batchId: string }[] = [];
    const skipped: string[] = [];
    for (const r of rows) {
      const assetId = matchAsset(r.account, owned);
      if (!assetId) {
        skipped.push(r.account);
        continue;
      }
      toInsert.push({ assetId, balance: String(r.balance), asOf, source: "csv", batchId });
    }
    if (toInsert.length > 0) await db.insert(snapshots).values(toInsert);
    revalidatePath("/assets");
    return { ok: true, imported: toInsert.length, skipped };
  } catch (err) {
    return { ok: false, imported: 0, skipped: [], error: err instanceof Error ? err.message : String(err) };
  }
}
