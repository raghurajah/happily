/**
 * v1 tax model (decision 9a5db500): real progressive FEDERAL brackets by filing
 * status with the standard deduction, applied to ordinary income (tax-deferred
 * withdrawals + taxable income streams). Bracket thresholds and the standard
 * deduction are expressed in today's dollars and INDEXED along each trial's
 * simulated inflation path. STATE tax is a single flat rate (decision e49729f7:
 * US-only). Capital-gains/basis on post-tax withdrawals is out of v1.
 */
import type { FilingStatus } from "./types";

interface Bracket {
  /** Lower edge of the bracket in today's dollars. */
  floor: number;
  rate: number;
}

/** 2024 federal brackets (today's-dollar baseline; indexed by inflation at runtime). */
const FEDERAL: Record<FilingStatus, { standardDeduction: number; brackets: Bracket[] }> = {
  single: {
    standardDeduction: 14_600,
    brackets: [
      { floor: 0, rate: 0.1 },
      { floor: 11_600, rate: 0.12 },
      { floor: 47_150, rate: 0.22 },
      { floor: 100_525, rate: 0.24 },
      { floor: 191_950, rate: 0.32 },
      { floor: 243_725, rate: 0.35 },
      { floor: 609_350, rate: 0.37 },
    ],
  },
  married_joint: {
    standardDeduction: 29_200,
    brackets: [
      { floor: 0, rate: 0.1 },
      { floor: 23_200, rate: 0.12 },
      { floor: 94_300, rate: 0.22 },
      { floor: 201_050, rate: 0.24 },
      { floor: 383_900, rate: 0.32 },
      { floor: 487_450, rate: 0.35 },
      { floor: 731_200, rate: 0.37 },
    ],
  },
};

/** Progressive federal tax on a taxable amount, with bracket edges scaled by `indexFactor`. */
function federalTax(taxable: number, filing: FilingStatus, indexFactor: number): number {
  if (taxable <= 0) return 0;
  const { brackets } = FEDERAL[filing];
  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const lo = brackets[i].floor * indexFactor;
    if (taxable <= lo) break;
    const hi = i + 1 < brackets.length ? brackets[i + 1].floor * indexFactor : Infinity;
    const slice = Math.min(taxable, hi) - lo;
    tax += slice * brackets[i].rate;
  }
  return tax;
}

export interface TaxSettings {
  filingStatus: FilingStatus;
  /** Flat state rate on the same post-deduction taxable base, e.g. 0.05. */
  stateRate: number;
}

/**
 * Total tax (federal + flat state) on ordinary income. `indexFactor` is the
 * cumulative inflation factor for the year, so brackets/deduction keep pace with
 * the trial's own inflation path rather than eroding in real terms.
 */
export function computeIncomeTax(
  ordinaryIncome: number,
  settings: TaxSettings,
  indexFactor: number,
): number {
  if (ordinaryIncome <= 0) return 0;
  const deduction = FEDERAL[settings.filingStatus].standardDeduction * indexFactor;
  const taxable = Math.max(0, ordinaryIncome - deduction);
  const federal = federalTax(taxable, settings.filingStatus, indexFactor);
  const state = taxable * settings.stateRate;
  return federal + state;
}
