import { describe, expect, it } from "vitest";
import { SeededRng } from "./rng.js";
import { simulateTrial } from "./simulate.js";
import type { EngineInput } from "./types.js";

function baseInput(over: Partial<EngineInput> = {}): EngineInput {
  return {
    startYear: 2026,
    persons: [
      { id: "a", birthYear: 1969, retirementAge: 65 }, // older
      { id: "b", birthYear: 1972, retirementAge: 65 }, // youngest
    ],
    lifeExpectancy: 90,
    startingBalances: { post_tax: 1_000_000, tax_deferred: 1_000_000, non_drawable: 0 },
    annualExpenses: 80_000,
    returnMean: 0.0951,
    returnSd: 0.0704,
    inflationMean: 0.037,
    inflationSd: 0.028,
    tax: { filingStatus: "married_joint", stateRate: 0 },
    withdrawal: { type: "post_tax_first" },
    incomeStreams: [],
    contributions: [],
    ...over,
  };
}

describe("simulateTrial (E3-S1 core)", () => {
  it("is reproducible: same input + seed → identical trajectory", () => {
    const a = simulateTrial(baseInput(), new SeededRng(2024));
    const b = simulateTrial(baseInput(), new SeededRng(2024));
    expect(a).toEqual(b);
  });

  it("runs until the YOUNGEST person reaches life expectancy", () => {
    // youngest born 1972, life expectancy 90 → last year 2062, inclusive from 2026.
    const res = simulateTrial(baseInput(), new SeededRng(1));
    expect(res.years[0].year).toBe(2026);
    expect(res.years.at(-1)!.year).toBe(1972 + 90); // 2062
    expect(res.years.at(-1)!.age).toBe(90);
    expect(res.years).toHaveLength(2062 - 2026 + 1);
  });

  it("with zero volatility, drawable buckets compound at the mean return net of spending", () => {
    // Deterministic: sd=0 so every year return = mean, inflation = mean.
    const input = baseInput({
      returnSd: 0,
      inflationSd: 0,
      returnMean: 0.05,
      inflationMean: 0.03,
      annualExpenses: 0,
      startingBalances: { post_tax: 100, tax_deferred: 0, non_drawable: 0 },
      lifeExpectancy: 55, // youngest currently 54 → 2 years (2026, 2027)
    });
    const res = simulateTrial(input, new SeededRng(1));
    // No spending → post_tax grows by 5% each year: 100 → 105 → 110.25.
    expect(res.years[0].postTax).toBeCloseTo(105, 6);
    expect(res.years[1].postTax).toBeCloseTo(110.25, 6);
  });

  it("non-drawable bucket grows by its own rate and is never spent", () => {
    const input = baseInput({
      returnSd: 0,
      inflationSd: 0,
      annualExpenses: 500_000, // force depletion of drawable
      nonDrawableGrowth: 0.04,
      startingBalances: { post_tax: 100_000, tax_deferred: 0, non_drawable: 200_000 },
      lifeExpectancy: 55,
    });
    const res = simulateTrial(input, new SeededRng(1));
    // non-drawable compounds at 4%, untouched by the (failing) spending.
    expect(res.years[0].nonDrawable).toBeCloseTo(200_000 * 1.04, 4);
    expect(res.years.at(-1)!.solvent).toBe(false);
  });

  it("marks insolvency when drawable assets cannot cover spending", () => {
    const input = baseInput({
      startingBalances: { post_tax: 50_000, tax_deferred: 0, non_drawable: 0 },
      annualExpenses: 80_000,
      returnSd: 0,
      inflationSd: 0,
      lifeExpectancy: 60,
    });
    const res = simulateTrial(input, new SeededRng(1));
    expect(res.success).toBe(false);
  });

  it("income streams offset spending need within their active years only", () => {
    const input = baseInput({
      returnSd: 0,
      inflationSd: 0,
      inflationMean: 0,
      annualExpenses: 40_000,
      startingBalances: { post_tax: 1_000_000, tax_deferred: 0, non_drawable: 0 },
      lifeExpectancy: 56, // 3 years: 2026,2027,2028
      incomeStreams: [
        {
          id: "ss",
          annualAmount: 40_000,
          cola: false,
          availability: { ranges: [{ startYear: 2027, endYear: null }], excludeYears: [] },
        },
      ],
    });
    const res = simulateTrial(input, new SeededRng(1));
    // 2026: no stream → spend 40k from post_tax. 2027+: stream covers all → no draw.
    const y2026 = res.years.find((y) => y.year === 2026)!;
    const y2027 = res.years.find((y) => y.year === 2027)!;
    // post_tax after 2026 draw (no growth, ret mean default 0.0951 but sd0 → +9.51%)
    expect(y2026.postTax).toBeCloseTo((1_000_000 - 40_000) * (1 + 0.0951), 2);
    // 2027 stream fully covers spend → only growth applies to prior balance.
    expect(y2027.postTax).toBeCloseTo(y2026.postTax * (1 + 0.0951), 2);
  });
});
