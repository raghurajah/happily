import { describe, expect, it } from "vitest";
import { runForecast } from "./runner.js";
import type { EngineInput } from "./types.js";

function baseInput(over: Partial<EngineInput> = {}): EngineInput {
  return {
    startYear: 2026,
    persons: [
      { id: "a", birthYear: 1969, retirementAge: 65 },
      { id: "b", birthYear: 1972, retirementAge: 65 },
    ],
    lifeExpectancy: 90,
    startingBalances: { post_tax: 1_000_000, tax_deferred: 1_000_000, non_drawable: 0 },
    annualExpenses: 80_000,
    returnMean: 0.0951,
    returnSd: 0.0704,
    inflationMean: 0.037,
    inflationSd: 0.028,
    tax: { filingStatus: "married_joint", stateRate: 0.05 },
    withdrawal: { type: "post_tax_first" },
    incomeStreams: [],
    contributions: [],
    ...over,
  };
}

describe("runForecast (E3-S4)", () => {
  it("produces per-year ordered percentile bands and a success curve", () => {
    const r = runForecast(baseInput(), { trials: 2000, seed: 1 });
    expect(r.bands).toHaveLength(2062 - 2026 + 1);
    expect(r.successCurve).toHaveLength(r.bands.length);
    for (const b of r.bands) {
      expect(b.p10).toBeLessThanOrEqual(b.p25);
      expect(b.p25).toBeLessThanOrEqual(b.p50);
      expect(b.p50).toBeLessThanOrEqual(b.p75);
      expect(b.p75).toBeLessThanOrEqual(b.p90);
    }
  });

  it("success probability is in [0,1] and the curve is non-increasing (cumulative survival)", () => {
    const r = runForecast(baseInput(), { trials: 2000, seed: 1 });
    expect(r.successProbability).toBeGreaterThanOrEqual(0);
    expect(r.successProbability).toBeLessThanOrEqual(1);
    for (let i = 1; i < r.successCurve.length; i++) {
      expect(r.successCurve[i].probability).toBeLessThanOrEqual(r.successCurve[i - 1].probability);
    }
    // headline = survival through the final age.
    expect(r.successProbability).toBe(r.successCurve.at(-1)!.probability);
  });

  it("is deterministic: same input + seed + trial count → identical Forecast", () => {
    const a = runForecast(baseInput(), { trials: 1000, seed: 99 });
    const b = runForecast(baseInput(), { trials: 1000, seed: 99 });
    expect(a).toEqual(b);
  });

  it("a richer plan succeeds more often than a leaner one", () => {
    const rich = runForecast(baseInput({ annualExpenses: 60_000 }), { trials: 2000, seed: 5 });
    const lean = runForecast(baseInput({ annualExpenses: 140_000 }), { trials: 2000, seed: 5 });
    expect(rich.successProbability).toBeGreaterThan(lean.successProbability);
  });

  it("golden-seed regression: 10k trials reproduce a fixed headline + p50", () => {
    const r = runForecast(baseInput(), { trials: 10_000, seed: 7 });
    expect(r.successProbability).toBe(0.9602);
    expect(r.bands.at(-1)!.p50).toBeCloseTo(14_496_286.9, 1);
  });

  it("meets the performance budget: 10k trials × 55 years under one second", () => {
    const input = baseInput({
      persons: [{ id: "a", birthYear: 1979, retirementAge: 65 }], // 55-year horizon to age 100
      lifeExpectancy: 102,
    });
    const t0 = performance.now();
    runForecast(input, { trials: 10_000, seed: 3 });
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(1000);
  });
});
