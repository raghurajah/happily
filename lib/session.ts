import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db";
import { households, users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Resolve the signed-in user's household, creating one on first use if somehow
 * absent (no roles — all members share one household, decision c1c6e5f9). Every
 * server action and data read goes through this so nothing is hard-coded to a
 * family (decision 1306ca6a) and queries are always household-scoped.
 */
export async function requireHousehold(): Promise<{ userId: string; householdId: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  if (session.user.householdId) {
    return { userId, householdId: session.user.householdId };
  }

  // Reuse the single existing household, or create one and link the user.
  let household = (await db.select().from(households).limit(1))[0];
  if (!household) {
    [household] = await db.insert(households).values({ name: "Household" }).returning();
  }
  await db.update(users).set({ householdId: household.id }).where(eq(users.id, userId));
  return { userId, householdId: household.id };
}
