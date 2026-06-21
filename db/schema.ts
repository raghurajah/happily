import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums (constrained by decisions a5edec0f, b6012bc6, b1ee4eca)
// ---------------------------------------------------------------------------

/** Asset kind: synced (E*TRADE-backed, unlinked until R2) or manual (hand-entered). */
export const assetKind = pgEnum("asset_kind", ["synced", "manual"]);

/** Tax/drawability bucket. The sim spends only from drawable buckets; non_drawable
 *  (e.g. home equity) counts toward net worth but is never withdrawn. */
export const bucket = pgEnum("bucket", ["post_tax", "tax_deferred", "non_drawable"]);

/** Where a Snapshot came from. Every successful sync persists one (decision b1ee4eca). */
export const snapshotSource = pgEnum("snapshot_source", ["etrade", "csv", "manual"]);

/** An income stream attaches to exactly one of a Person or an Asset (decision b6012bc6). */
export const streamOwnerKind = pgEnum("stream_owner_kind", ["person", "asset"]);

// ---------------------------------------------------------------------------
// Auth / membership
// ---------------------------------------------------------------------------

/** Closed membership — seeded at setup, no public signup (decision c1c6e5f9, E1-S3). */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  householdId: uuid("household_id").references(() => households.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Household & persons (decision c9da4675)
// ---------------------------------------------------------------------------

/** User-set target allocation by asset class (fractions 0–1), for drift/rebalance (E7). */
export type TargetAllocation = Partial<
  Record<"us_equity" | "intl_equity" | "bonds" | "cash" | "real_estate" | "other", number>
>;

export const households = pgTable("households", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  /** Single household-level annual expenses in today's dollars, inflation-adjusted. */
  annualExpenses: numeric("annual_expenses", { precision: 14, scale: 2 }),
  /** Target allocation by asset class (E7-S2); null until the user sets one. */
  targetAllocation: jsonb("target_allocation").$type<TargetAllocation>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const persons = pgTable("persons", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  birthYear: integer("birth_year").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Assets (decision a5edec0f) + ownership by 1+ persons (decision b6012bc6)
// ---------------------------------------------------------------------------

export const assets = pgTable("assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: assetKind("kind").notNull(),
  bucket: bucket("bucket").notNull(),
  /** Manual assets only: current hand-entered value in dollars (synced derive from Snapshots). */
  manualValue: numeric("manual_value", { precision: 14, scale: 2 }),
  /** Manual assets only: optional simple annual growth assumption (e.g. 0.03 = 3%). */
  growthRate: numeric("growth_rate", { precision: 6, scale: 4 }),
  /** Synced assets: E*TRADE account identifier, linked in R2 (null until then). */
  etradeAccountId: text("etrade_account_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Join table — an Asset is owned by one or more Persons. */
export const assetOwners = pgTable(
  "asset_owners",
  {
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.assetId, t.personId] })],
);

// ---------------------------------------------------------------------------
// Snapshots — append-only balance history (decision b1ee4eca)
// ---------------------------------------------------------------------------

/** One row per (asset, as-of date). A "sync" writes a batch sharing batchId + asOf.
 *  Append-only: never edited or deleted by normal app flows. */
export const snapshots = pgTable("snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  balance: numeric("balance", { precision: 14, scale: 2 }).notNull(),
  asOf: timestamp("as_of", { withTimezone: true }).notNull(),
  source: snapshotSource("source").notNull(),
  /** Groups the per-asset rows written by a single sync/import/entry event. */
  batchId: uuid("batch_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Income streams & contributions (decision b6012bc6)
// ---------------------------------------------------------------------------

/** Year-level availability: active ranges with optional excluded years, persisted as JSON.
 *  e.g. { ranges: [{ startYear: 2030, endYear: 2050 }], excludeYears: [2035] } */
export type Availability = {
  ranges: Array<{ startYear: number; endYear: number | null }>;
  excludeYears: number[];
};

export const incomeStreams = pgTable("income_streams", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ownerKind: streamOwnerKind("owner_kind").notNull(),
  personId: uuid("person_id").references(() => persons.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id").references(() => assets.id, { onDelete: "cascade" }),
  /** Annual amount in today's dollars. */
  annualAmount: numeric("annual_amount", { precision: 14, scale: 2 }).notNull(),
  /** Cost-of-living adjustment: when true, grows with the trial's inflation path. */
  cola: boolean("cola").notNull().default(false),
  availability: jsonb("availability").$type<Availability>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Per-year enable/disable toggle set, persisted as JSON.
 *  e.g. { ranges: [{ startYear: 2026, endYear: 2034 }], excludeYears: [] } — same shape as Availability. */
export const contributions = pgTable("contributions", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  personId: uuid("person_id")
    .notNull()
    .references(() => persons.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** Annual contribution in today's dollars. */
  annualAmount: numeric("annual_amount", { precision: 14, scale: 2 }).notNull(),
  /** Which bucket the contribution flows into while active. */
  targetBucket: bucket("target_bucket").notNull(),
  availability: jsonb("availability").$type<Availability>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Scenarios & Forecasts (decision 2949f831)
// ---------------------------------------------------------------------------

/** Full engine assumption set for a Scenario, persisted as a typed JSON blob so the
 *  shape can evolve with the engine without a migration per knob. Detailed in E4-S1. */
export type ScenarioAssumptions = {
  /** Per-person retirement age, keyed by person id. */
  retirementAges: Record<string, number>;
  /** Annual household spending in today's dollars; overrides the household default. */
  annualExpenses: number;
  /** Life expectancy age; horizon runs until the youngest person reaches it. */
  lifeExpectancy: number;
  /** Annual return distribution (real or nominal handled by engine). */
  returnMean: number;
  returnSd: number;
  /** Annual inflation distribution. */
  inflationMean: number;
  inflationSd: number;
  tax: {
    filingStatus: "single" | "married_joint";
    stateRate: number;
  };
  withdrawal:
    | { strategy: "post_tax_first" }
    | { strategy: "tax_deferred_first" }
    | { strategy: "blend"; controlPoints: Array<{ age: number; postTaxPct: number }> };
  /** Optional per-Scenario overrides of stream/contribution amounts, keyed by id. */
  streamOverrides?: Record<string, number>;
  contributionOverrides?: Record<string, number>;
};

export const scenarios = pgTable(
  "scenarios",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Exactly one Scenario per household is the active Plan (partial unique index below). */
    isPlan: boolean("is_plan").notNull().default(false),
    assumptions: jsonb("assumptions").$type<ScenarioAssumptions>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("one_active_plan_per_household")
      .on(t.householdId)
      .where(sql`${t.isPlan} = true`),
  ],
);

/** Frozen percentile bands per year of the simulation (mirrors the engine output). */
export type ForecastBand = {
  year: number;
  age: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
};

/** Per-age success probability point. */
export type SuccessPoint = { year: number; age: number; probability: number };

export const forecasts = pgTable("forecasts", {
  id: uuid("id").defaultRandom().primaryKey(),
  scenarioId: uuid("scenario_id")
    .notNull()
    .references(() => scenarios.id, { onDelete: "cascade" }),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  /** RNG seed used, so the run is reproducible. */
  seed: text("seed").notNull(),
  /** Hash of the resolved engine inputs, to detect when a Forecast is stale vs its Scenario. */
  inputHash: text("input_hash").notNull(),
  bands: jsonb("bands").$type<ForecastBand[]>().notNull(),
  successCurve: jsonb("success_curve").$type<SuccessPoint[]>().notNull(),
  /** Snapshot of the starting balances / resolved inputs the run froze. */
  startingInputs: jsonb("starting_inputs").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// E*TRADE sync (R2 / E6) — interactive OAuth (decision db09d3a5), read-only
// ---------------------------------------------------------------------------

/** Which E*TRADE environment a connection targets (sandbox until the prod key lands). */
export const etradeEnv = pgEnum("etrade_env", ["sandbox", "production"]);

/** One E*TRADE OAuth connection per household. Access tokens stored ENCRYPTED at rest. */
export const etradeConnections = pgTable("etrade_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id")
    .notNull()
    .unique()
    .references(() => households.id, { onDelete: "cascade" }),
  env: etradeEnv("env").notNull().default("sandbox"),
  /** AES-256-GCM encrypted OAuth access token + secret (decision db09d3a5). */
  accessTokenEnc: text("access_token_enc").notNull(),
  accessTokenSecretEnc: text("access_token_secret_enc").notNull(),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Position-level holdings captured per sync (decision: position storage per sync). */
export const positions = pgTable("positions", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  /** Shares the batchId of the Snapshot written by the same sync event. */
  batchId: uuid("batch_id").notNull(),
  asOf: timestamp("as_of", { withTimezone: true }).notNull(),
  symbol: text("symbol").notNull(),
  description: text("description"),
  quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull(),
  marketValue: numeric("market_value", { precision: 14, scale: 2 }).notNull(),
  costBasis: numeric("cost_basis", { precision: 14, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const householdsRelations = relations(households, ({ many }) => ({
  persons: many(persons),
  assets: many(assets),
  incomeStreams: many(incomeStreams),
  contributions: many(contributions),
  scenarios: many(scenarios),
}));

export const personsRelations = relations(persons, ({ one, many }) => ({
  household: one(households, { fields: [persons.householdId], references: [households.id] }),
  ownedAssets: many(assetOwners),
  contributions: many(contributions),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  household: one(households, { fields: [assets.householdId], references: [households.id] }),
  owners: many(assetOwners),
  snapshots: many(snapshots),
}));

export const assetOwnersRelations = relations(assetOwners, ({ one }) => ({
  asset: one(assets, { fields: [assetOwners.assetId], references: [assets.id] }),
  person: one(persons, { fields: [assetOwners.personId], references: [persons.id] }),
}));

export const snapshotsRelations = relations(snapshots, ({ one }) => ({
  asset: one(assets, { fields: [snapshots.assetId], references: [assets.id] }),
}));

export const scenariosRelations = relations(scenarios, ({ one, many }) => ({
  household: one(households, { fields: [scenarios.householdId], references: [households.id] }),
  forecasts: many(forecasts),
}));

export const forecastsRelations = relations(forecasts, ({ one }) => ({
  scenario: one(scenarios, { fields: [forecasts.scenarioId], references: [scenarios.id] }),
}));
