/**
 * Seed a household member (decision c1c6e5f9: closed membership, created at setup;
 * no public signup). Idempotent on email. Run with:
 *
 *   SEED_EMAIL=you@example.com SEED_PASSWORD=secret SEED_NAME="You" pnpm db:seed
 */
import { config } from "dotenv";
import { eq } from "drizzle-orm";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const email = process.env.SEED_EMAIL?.toLowerCase();
  const password = process.env.SEED_PASSWORD;
  const name = process.env.SEED_NAME ?? null;
  const householdName = process.env.SEED_HOUSEHOLD ?? "Household";

  if (!email || !password) {
    throw new Error("Set SEED_EMAIL and SEED_PASSWORD to seed a member.");
  }

  // Import after env is loaded so db/index.ts sees DATABASE_URL.
  const { db } = await import("../db/index.js");
  const { households, users } = await import("../db/schema.js");
  const { hashPassword } = await import("../lib/password.js");

  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    console.log(`User ${email} already exists — nothing to do.`);
    return;
  }

  // Reuse the single existing household if present; otherwise create one.
  let household = (await db.select().from(households).limit(1))[0];
  if (!household) {
    [household] = await db.insert(households).values({ name: householdName }).returning();
  }

  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash: await hashPassword(password),
      name,
      householdId: household.id,
    })
    .returning();

  console.log(`Seeded member ${user.email} in household "${household.name}" (${household.id}).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
