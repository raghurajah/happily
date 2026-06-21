import { describe, expect, it } from "vitest";
import { requiredMinimumDistribution, rmdStartAge } from "./rmd.js";
import { simulateTrial } from "./simulate.js";
import { buildHooks } from "./hooks.js";
import type { EngineInput, PersonInput } from "./types.js";

const person = (birthYear: number): PersonInput => ({ id: String(birthYear), birthYear, retirementAge: 65 });

describe("RMD (E3-S2)", () => {
  it("start age is 73 for pre-1960 births, 75 otherwise", () => {
    expect(rmdStartAge(1955)).toBe(73);
    expect(rmdStartAge(1960)).toBe(75);
  });

  it("is zero before the start age", () => {
    // born 1960 → start age 75; in 2026 they are 66.
    expect(requiredMinimumDistribution([person(1960)], 2026, 1_000_000)).toBe(0);
  });

  it("equals balance / Uniform-Lifetime divisor at the start age", () => {
    // born 1953 → start 73; at age 73 (year 2026) divisor = 26.5.
    const rmd = requiredMinimumDistribution([person(1953)], 2026, 1_000_000);
    expect(rmd).toBeCloseTo(1_000_000 / 26.5, 4);
  });

  it("uses the older person's (larger) requirement across a household", () => {
    const older = person(1950); // age 76 in 2026, divisor 23.7
    const younger = person(1958); // age 68, below start
    const rmd = requiredMinimumDistribution([older, younger], 2026, 1_000_000);
    expect(rmd).toBeCloseTo(1_000_000 / 23.7, 4);
  });
});

describe("RMD wired into a trial (excess reinvested post-tax)", () => {
  it("forces a tax-deferred withdrawal that exceeds the spending need, reinvesting the rest", () => {
    const input: EngineInput = {
      startYear: 2026,
      persons: [person(1953)], // age 73 → RMD applies
      lifeExpectancy: 73, // single year
      startingBalances: { post_tax: 0, tax_deferred: 1_000_000, non_drawable: 0 },
      annualExpenses: 10_000, // far below the RMD
      returnMean: 0,
      returnSd: 0,
      inflationMean: 0,
      inflationSd: 0,
      tax: { filingStatus: "single", stateRate: 0 },
      withdrawal: { type: "tax_deferred_first" },
      incomeStreams: [],
      contributions: [],
    };
    const res = simulateTrial(input, { next: () => 0, normal: () => 0 }, buildHooks(input));
    const rmd = 1_000_000 / 26.5; // ≈ 37,736
    const y = res.years[0];
    // tax-deferred reduced by the full RMD (no growth: ret = 0).
    expect(y.taxDeferred).toBeCloseTo(1_000_000 - rmd, 0);
    // RMD (≈37.7k) covered the 10k spend; the excess minus income tax was
    // reinvested into post-tax, so post-tax ends positive and the year is solvent.
    expect(y.postTax).toBeGreaterThan(0);
    expect(y.postTax).toBeLessThan(rmd - 10_000); // less than excess, because tax was paid
    expect(y.solvent).toBe(true);
  });
});
