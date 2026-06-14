"use server";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { assets, etradeConnections, positions, snapshots } from "@/db/schema";
import { EtradeClient } from "@/lib/etrade/client";
import { isConfigured, resolveEtradeConfig } from "@/lib/etrade/config";
import { decryptToken, encryptToken } from "@/lib/etrade/crypto";
import { bucketForAccount } from "@/lib/etrade/mapping";
import type { OAuthToken } from "@/lib/etrade/oauth";
import { requireHousehold } from "@/lib/session";

const REQUEST_TOKEN_COOKIE = "etrade_rt";

/** Step 1: get a request token and return the URL the user authorizes at. */
export async function connectStart(): Promise<{ url: string } | { error: string }> {
  await requireHousehold();
  const cfg = resolveEtradeConfig();
  if (!isConfigured(cfg)) {
    return { error: "E*TRADE consumer key/secret not configured. Use manual entry or CSV import for now." };
  }
  const client = new EtradeClient(cfg);
  const requestToken = await client.getRequestToken();
  // Stash the request token (encrypted, httpOnly) until the verifier comes back.
  const jar = await cookies();
  jar.set(REQUEST_TOKEN_COOKIE, encryptToken(JSON.stringify({ ...requestToken, env: cfg.env })), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return { url: client.authorizeUrl(requestToken.token) };
}

/** Step 3: exchange the verifier for an access token and store the connection. */
export async function connectComplete(formData: FormData) {
  const { householdId } = await requireHousehold();
  const verifier = z.string().trim().min(1).parse(formData.get("verifier"));
  const cfg = resolveEtradeConfig();
  const jar = await cookies();
  const stash = jar.get(REQUEST_TOKEN_COOKIE)?.value;
  if (!stash) throw new Error("Connection expired — start again.");
  const requestToken = JSON.parse(decryptToken(stash)) as OAuthToken & { env: string };

  const client = new EtradeClient(cfg);
  const access = await client.getAccessToken(requestToken, verifier);

  await db
    .insert(etradeConnections)
    .values({
      householdId,
      env: cfg.env,
      accessTokenEnc: encryptToken(access.token),
      accessTokenSecretEnc: encryptToken(access.tokenSecret),
    })
    .onConflictDoUpdate({
      target: etradeConnections.householdId,
      set: {
        env: cfg.env,
        accessTokenEnc: encryptToken(access.token),
        accessTokenSecretEnc: encryptToken(access.tokenSecret),
        connectedAt: new Date(),
      },
    });
  jar.delete(REQUEST_TOKEN_COOKIE);
  revalidatePath("/assets");
}

export async function disconnectEtrade() {
  const { householdId } = await requireHousehold();
  await db.delete(etradeConnections).where(eq(etradeConnections.householdId, householdId));
  revalidatePath("/assets");
}

/**
 * Manual sync (and sync-on-open): list accounts, provision/link a synced asset per
 * account, write a dated Snapshot batch of balances (decisions 3f1b6b21, b1ee4eca)
 * and store positions per sync (E6-S3). Strictly read-only against E*TRADE.
 */
export async function syncNow() {
  const { householdId } = await requireHousehold();
  const connection = (
    await db.select().from(etradeConnections).where(eq(etradeConnections.householdId, householdId))
  )[0];
  if (!connection) throw new Error("E*TRADE is not connected.");

  const cfg = resolveEtradeConfig(connection.env);
  const client = new EtradeClient(cfg);
  const token: OAuthToken = {
    token: decryptToken(connection.accessTokenEnc),
    tokenSecret: decryptToken(connection.accessTokenSecretEnc),
  };

  const accounts = await client.listAccounts(token);
  const existing = await db.select().from(assets).where(eq(assets.householdId, householdId));
  const batchId = randomUUID();
  const asOf = new Date();

  for (const account of accounts) {
    // Find or create the synced asset for this E*TRADE account.
    let asset = existing.find((a) => a.etradeAccountId === account.accountId);
    if (!asset) {
      [asset] = await db
        .insert(assets)
        .values({
          householdId,
          name: account.accountDesc || `E*TRADE ${account.accountId}`,
          kind: "synced",
          bucket: bucketForAccount(account),
          etradeAccountId: account.accountId,
        })
        .returning();
    }

    const balance = await client.getBalance(token, account.accountIdKey);
    await db.insert(snapshots).values({
      assetId: asset.id,
      balance: String(balance),
      asOf,
      source: "etrade",
      batchId,
    });

    const accountPositions = await client.getPositions(token, account.accountIdKey);
    if (accountPositions.length > 0) {
      await db.insert(positions).values(
        accountPositions.map((p) => ({
          assetId: asset!.id,
          batchId,
          asOf,
          symbol: p.symbol,
          description: p.description,
          quantity: String(p.quantity),
          marketValue: String(p.marketValue),
          costBasis: p.costBasis !== null ? String(p.costBasis) : null,
        })),
      );
    }
  }

  revalidatePath("/assets");
  revalidatePath("/dashboard");
}

export async function getEtradeStatus(householdId: string) {
  const connection = (
    await db.select().from(etradeConnections).where(and(eq(etradeConnections.householdId, householdId)))
  )[0];
  const cfg = resolveEtradeConfig();
  return {
    connected: Boolean(connection),
    env: connection?.env ?? cfg.env,
    connectedAt: connection?.connectedAt ?? null,
    configured: isConfigured(cfg),
  };
}
