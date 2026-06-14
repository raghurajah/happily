import { describe, expect, it } from "vitest";
import { computeIncomeTax } from "./tax.js";

const mfj = { filingStatus: "married_joint" as const, stateRate: 0 };
const single = { filingStatus: "single" as const, stateRate: 0 };

describe("computeIncomeTax (E3-S2)", () => {
  it("returns 0 when income is below the standard deduction", () => {
    expect(computeIncomeTax(25_000, mfj, 1)).toBe(0); // MFJ std deduction 29,200
  });

  it("applies progressive MFJ brackets above the deduction", () => {
    // 100k ordinary, MFJ: taxable = 100,000 - 29,200 = 70,800.
    // 10% on first 23,200 = 2,320; 12% on (70,800-23,200)=47,600 = 5,712. Total 8,032.
    expect(computeIncomeTax(100_000, mfj, 1)).toBeCloseTo(8_032, 2);
  });

  it("single brackets differ from MFJ", () => {
    const taxMfj = computeIncomeTax(100_000, mfj, 1);
    const taxSingle = computeIncomeTax(100_000, single, 1);
    expect(taxSingle).toBeGreaterThan(taxMfj);
  });

  it("indexes brackets and deduction by the inflation factor", () => {
    // At index 2.0, the deduction and every bracket edge double, so the SAME real
    // income (also doubled) pays exactly double the nominal tax of the base case.
    const base = computeIncomeTax(100_000, mfj, 1);
    const indexed = computeIncomeTax(200_000, mfj, 2);
    expect(indexed).toBeCloseTo(base * 2, 2);
  });

  it("adds flat state tax on the post-deduction base", () => {
    const noState = computeIncomeTax(100_000, mfj, 1);
    const withState = computeIncomeTax(100_000, { ...mfj, stateRate: 0.05 }, 1);
    // taxable base = 70,800 → state = 3,540.
    expect(withState - noState).toBeCloseTo(70_800 * 0.05, 2);
  });

  it("effective rate in retirement is far below the Excel's flat 42.6%", () => {
    const tax = computeIncomeTax(80_000, mfj, 1);
    expect(tax / 80_000).toBeLessThan(0.1);
  });
});
