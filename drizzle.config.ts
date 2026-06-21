import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load .env.local for local drizzle-kit commands (Railway injects env directly).
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
