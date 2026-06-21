import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { assets, positions } from "@/db/schema";
import { attributeChange, type AttributionResult, type HoldingSnapshot } from "./attribution";
import type { Holding } from "./allocation";

type PositionRow = typeof positions.$inferSelect;

async function householdPositions(householdId: string): Promise<PositionRow[]> {
  const assetRows = await db.select({ id: assets.id }).from(assets).where(eq(assets.householdId, householdId));
  const ids = assetRows.map((a) => a.id);
  if (ids.length === 0) return [];
  return db.select().from(positions).where(inArray(positions.assetId, ids)).orderBy(desc(positions.asOf));
}

/** Aggregate a batch's rows into per-symbol holdings. */
function toHoldings(rows: PositionRow[]): HoldingSnapshot[] {
  const bySymbol = new Map<string, { quantity: number; marketValue: number }>();
  for (const r of rows) {
    const cur = bySymbol.get(r.symbol) ?? { quantity: 0, marketValue: 0 };
    cur.quantity += Number(r.quantity);
    cur.marketValue += Number(r.marketValue);
    bySymbol.set(r.symbol, cur);
  }
  return [...bySymbol].map(([symbol, v]) => ({ symbol, ...v }));
}

/** The most recent position batch as holdings (for allocation). */
export async function getLatestHoldings(householdId: string): Promise<{ holdings: Holding[]; asOf: Date | null }> {
  const rows = await householdPositions(householdId);
  if (rows.length === 0) return { holdings: [], asOf: null };
  const latestBatch = rows[0].batchId;
  const batchRows = rows.filter((r) => r.batchId === latestBatch);
  return {
    holdings: toHoldings(batchRows).map((h) => ({ symbol: h.symbol, marketValue: h.marketValue })),
    asOf: batchRows[0].asOf,
  };
}

/** Attribution between the two most recent position batches ("what moved my number"). */
export async function getAttribution(
  householdId: string,
): Promise<{ result: AttributionResult; from: Date; to: Date } | null> {
  const rows = await householdPositions(householdId);
  const batches = [...new Set(rows.map((r) => r.batchId))]; // already desc by asOf
  if (batches.length < 2) return null;
  const [newBatch, oldBatch] = batches;
  const newRows = rows.filter((r) => r.batchId === newBatch);
  const oldRows = rows.filter((r) => r.batchId === oldBatch);
  return {
    result: attributeChange(toHoldings(oldRows), toHoldings(newRows)),
    from: oldRows[0].asOf,
    to: newRows[0].asOf,
  };
}
