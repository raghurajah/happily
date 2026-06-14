import { describe, expect, it } from "vitest";
import { blendPostTaxFraction, planWithdrawal } from "./strategy.js";
import { simulateTrial } from "./simulate.js";
import { buildHooks } from "./hooks.js";
import type { EngineInput, PersonInput } from "./types.js";

const balances = { postTax: 100_000, taxDeferred: 100_000 };

describe("planWithdrawal (E3-S3)", () => {
  it("post_tax_first drains post-tax before tax-deferred", () => {
    expect(planWithdrawal(60_000, balances, { type: "post_tax_first" }, 70)).toEqual({
      fromPost: 60_000,
      fromTaxDeferred: 0,
    });
    expect(planWithdrawal(160_000, balances, { type: "post_tax_first" }, 70)).toEqual({
      fromPost: 100_000,
      fromTaxDeferred: 60_000,
    });
  });

  it("tax_deferred_first drains tax-deferred before post-tax", () => {
    expect(planWithdrawal(60_000, balances, { type: "tax_deferred_first" }, 70)).toEqual({
      fromPost: 0,
      fromTaxDeferred: 60_000,
    });
  });

  it("blend splits by the age-interpolated post-tax fraction", () => {
    const strat = {
      type: "blend" as const,
      controlPoints: [
        { age: 65, postTaxPct: 1 },
        { age: 85, postTaxPct: 0 },
      ],
    };
    // age 75 = midpoint → 50/50.
    expect(planWithdrawal(40_000, balances, strat, 75)).toEqual({
      fromPost: 20_000,
      fromTaxDeferred: 20_000,
    });
  });

  it("blend spills to post-tax when tax-deferred is short", () => {
    const strat = {
      type: "blend" as const,
      controlPoints: [{ age: 70, postTaxPct: 0 }], // wants all from TD
    };
    const plan = planWithdrawal(50_000, { postTax: 100_000, taxDeferred: 30_000 }, strat, 70);
    expect(plan.fromTaxDeferred).toBe(30_000);
    expect(plan.fromPost).toBe(20_000);
  });
});

describe("blendPostTaxFraction", () => {
  it("flat-extrapolates outside the control-point range", () => {
    const cp = [
      { age: 65, postTaxPct: 0.8 },
      { age: 80, postTaxPct: 0.2 },
    ];
    expect(blendPostTaxFraction(cp, 60)).toBeCloseTo(0.8);
    expect(blendPostTaxFraction(cp, 90)).toBeCloseTo(0.2);
    expect(blendPostTaxFraction(cp, 72.5)).toBeCloseTo(0.5); // midpoint
  });
});

const person = (birthYear: number): PersonInput => ({ id: "p", birthYear, retirementAge: 65 });

function input(over: Partial<EngineInput>): EngineInput {
  return {
    startYear: 2026,
    persons: [person(1972)],
    lifeExpectancy: 56, // 3 years
    startingBalances: { post_tax: 500_000, tax_deferred: 500_000, non_drawable: 0 },
    annualExpenses: 60_000,
    returnMean: 0,
    returnSd: 0,
    inflationMean: 0,
    inflationSd: 0,
    tax: { filingStatus: "single", stateRate: 0 },
    withdrawal: { type: "post_tax_first" },
    incomeStreams: [],
    contributions: [],
    ...over,
  };
}

describe("strategy in a trial", () => {
  const zeroRng = { next: () => 0, normal: () => 0 };

  it("tax_deferred_first pulls spending from tax-deferred (and pays tax)", () => {
    const inp = input({ withdrawal: { type: "tax_deferred_first" } });
    const res = simulateTrial(inp, zeroRng, buildHooks(inp));
    const y = res.years[0];
    // post-tax only shrinks by tax paid; tax-deferred takes the 60k spend + tax base.
    expect(y.taxDeferred).toBeLessThan(500_000 - 60_000 + 1); // dropped by at least the spend
    expect(y.postTax).toBeLessThanOrEqual(500_000); // tax may be drawn from post-tax
  });

  it("contributions during working years land in their bucket with availability", () => {
    const inp = input({
      persons: [person(1985)], // age 41, working
      annualExpenses: 0,
      startingBalances: { post_tax: 0, tax_deferred: 0, non_drawable: 0 },
      lifeExpectancy: 42, // 2 years: 2026, 2027
      contributions: [
        {
          id: "k",
          annualAmount: 20_000,
          targetBucket: "tax_deferred",
          availability: { ranges: [{ startYear: 2026, endYear: 2026 }], excludeYears: [] },
        },
      ],
    });
    const res = simulateTrial(inp, zeroRng, buildHooks(inp));
    // 2026 contributes 20k; 2027 inactive → no further contribution.
    expect(res.years[0].taxDeferred).toBeCloseTo(20_000, 4);
    expect(res.years[1].taxDeferred).toBeCloseTo(20_000, 4);
  });
});
