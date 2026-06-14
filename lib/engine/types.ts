/**
 * Pure engine value types (decision 71b1665b). All amounts in USD, today's
 * dollars on input (decision e49729f7). The engine inflates expenses/streams
 * along each trial's own simulated inflation path.
 */

export type Bucket = "post_tax" | "tax_deferred" | "non_drawable";

export type FilingStatus = "single" | "married_joint";

/** Year-level availability: active ranges minus excluded years (decision b6012bc6). */
export interface Availability {
  ranges: Array<{ startYear: number; endYear: number | null }>;
  excludeYears: number[];
}

export interface PersonInput {
  /** Stable id, used to key per-person settings. */
  id: string;
  birthYear: number;
  /** Age at which this person stops contributing / earning work income. */
  retirementAge: number;
}

export interface IncomeStreamInput {
  id: string;
  /** Annual amount in today's dollars. */
  annualAmount: number;
  /** When true, grows with the trial's cumulative inflation; else flat nominal. */
  cola: boolean;
  availability: Availability;
}

export interface ContributionInput {
  id: string;
  /** Annual amount in today's dollars; saved into targetBucket while active. */
  annualAmount: number;
  targetBucket: Exclude<Bucket, "non_drawable">;
  availability: Availability;
}

export type WithdrawalStrategy =
  | { type: "post_tax_first" }
  | { type: "tax_deferred_first" }
  /** Time-keyed split: at each control point, this % of spending comes from post-tax. */
  | { type: "blend"; controlPoints: Array<{ age: number; postTaxPct: number }> };

export interface EngineInput {
  /** First simulated year (e.g. the current calendar year). */
  startYear: number;
  persons: PersonInput[];
  /** Run until the YOUNGEST person reaches this age (decision c9da4675). */
  lifeExpectancy: number;

  /** Starting balances per bucket (USD). */
  startingBalances: Record<Bucket, number>;
  /** Annual growth applied to the non-drawable bucket (real estate etc.); 0 = flat. */
  nonDrawableGrowth?: number;

  /** Household annual spending in today's dollars (decision c9da4675). */
  annualExpenses: number;

  /** Independent annual normal draws (decision 10d3df55); no return cap. */
  returnMean: number;
  returnSd: number;
  inflationMean: number;
  inflationSd: number;

  tax: {
    filingStatus: FilingStatus;
    /** Flat state rate on ordinary income, e.g. 0.05 (decision 9a5db500). */
    stateRate: number;
  };

  withdrawal: WithdrawalStrategy;
  incomeStreams: IncomeStreamInput[];
  contributions: ContributionInput[];
}

/** One simulated year's snapshot within a single trial. */
export interface YearState {
  year: number;
  /** Age of the youngest person this year. */
  age: number;
  postTax: number;
  taxDeferred: number;
  nonDrawable: number;
  /** Drawable + non-drawable at end of year. */
  totalAssets: number;
  /** True if drawable assets covered the year's spending need. */
  solvent: boolean;
}

export interface TrialResult {
  years: YearState[];
  /** True if solvent through the entire horizon. */
  success: boolean;
}
