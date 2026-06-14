/**
 * Single deterministic trial (decision 71b1665b). Given an EngineInput and a
 * seeded Rng, simulate the household year by year to the horizon and return the
 * per-year trajectory + overall success.
 *
 * E3-S1 implements: seeded sampling, the annual loop to the youngest person's
 * life expectancy, inflation-pathed expenses, income streams & contributions
 * with year availability, bucket growth, and a default post-tax-first draw-down.
 * Tax + RMD (E3-S2) and the full strategy set (E3-S3) plug into the marked seams.
 */
import { isActive, youngestBirthYear } from "./availability";
import type { Rng } from "./rng";
import { planWithdrawal } from "./strategy";
import type { EngineInput, TrialResult, YearState } from "./types";

const EPS = 1e-6;

export interface TrialHooks {
  /**
   * Tax on this year's ordinary income (tax-deferred withdrawals + taxable
   * streams), indexed to the cumulative inflation factor. Default: no tax (S1).
   * Real federal-bracket + flat-state implementation lands in E3-S2.
   */
  computeTax?: (ordinaryIncome: number, cumInflation: number) => number;
  /**
   * Minimum forced withdrawal from the tax-deferred bucket this year (RMD floor).
   * Default: 0 (S1). IRS Uniform Lifetime Table implementation lands in E3-S2.
   */
  rmdFloor?: (year: number, taxDeferredBalance: number) => number;
}

export function simulateTrial(input: EngineInput, rng: Rng, hooks: TrialHooks = {}): TrialResult {
  const computeTax = hooks.computeTax ?? (() => 0);
  const rmdFloor = hooks.rmdFloor ?? (() => 0);

  const youngestBY = youngestBirthYear(input.persons);
  const lastYear = youngestBY + input.lifeExpectancy;

  let postTax = input.startingBalances.post_tax;
  let taxDeferred = input.startingBalances.tax_deferred;
  let nonDrawable = input.startingBalances.non_drawable;
  const ndGrowth = input.nonDrawableGrowth ?? 0;

  // Cumulative inflation factor: 1.0 in the first simulated year (today's dollars).
  let cumInflation = 1;

  const years: YearState[] = [];
  let success = true;

  for (let year = input.startYear; year <= lastYear; year++) {
    const age = year - youngestBY;

    // 1. Draw this year's return and inflation — independent normals, no cap.
    const ret = rng.normal(input.returnMean, input.returnSd);
    const infl = rng.normal(input.inflationMean, input.inflationSd);

    // 2. Contributions (today's dollars → inflated) flow into their bucket while active.
    for (const c of input.contributions) {
      if (!isActive(c.availability, year)) continue;
      const amount = c.annualAmount * cumInflation;
      if (c.targetBucket === "post_tax") postTax += amount;
      else taxDeferred += amount;
    }

    // 3. Income streams reduce the spending need; COLA streams track inflation.
    let streamIncome = 0;
    for (const s of input.incomeStreams) {
      if (!isActive(s.availability, year)) continue;
      streamIncome += s.annualAmount * (s.cola ? cumInflation : 1);
    }

    const nominalExpense = input.annualExpenses * cumInflation;
    let need = nominalExpense - streamIncome;

    // 4. RMD floor: forced tax-deferred withdrawal even if not needed for spending;
    //    the excess over the spending need is reinvested post-tax (decision b10161a1).
    const rmd = Math.min(rmdFloor(year, taxDeferred), taxDeferred);
    let fromTaxDeferred = 0;
    if (rmd > 0) {
      taxDeferred -= rmd;
      fromTaxDeferred += rmd;
      need -= rmd; // RMD cash covers spending first
    }

    // 5. Cover any remaining need using the per-Scenario withdrawal strategy
    //    (E3-S3). The RMD above already bound the tax-deferred floor.
    let solvent = true;
    if (need < 0) {
      // Surplus income/RMD: reinvest into post-tax.
      postTax += -need;
      need = 0;
    } else if (need > EPS) {
      const plan = planWithdrawal(need, { postTax, taxDeferred }, input.withdrawal, age);
      postTax -= plan.fromPost;
      taxDeferred -= plan.fromTaxDeferred;
      fromTaxDeferred += plan.fromTaxDeferred;
      need -= plan.fromPost + plan.fromTaxDeferred;
      if (need > EPS) solvent = false; // ran out of drawable assets
    }

    // 6. Tax on ordinary income (tax-deferred withdrawals + taxable streams).
    //    Paid out of post-tax (S1: zero). Grossing-up arrives with E3-S2.
    const tax = computeTax(fromTaxDeferred + streamIncome, cumInflation);
    if (tax > 0) {
      const fromPost = Math.min(postTax, tax);
      postTax -= fromPost;
      const rest = tax - fromPost;
      if (rest > EPS) {
        const fromTD = Math.min(taxDeferred, rest);
        taxDeferred -= fromTD;
        if (rest - fromTD > EPS) solvent = false;
      }
    }

    // 7. Investment growth on end-of-year balances.
    postTax = Math.max(0, postTax) * (1 + ret);
    taxDeferred = Math.max(0, taxDeferred) * (1 + ret);
    nonDrawable = Math.max(0, nonDrawable) * (1 + ndGrowth);

    const totalAssets = postTax + taxDeferred + nonDrawable;
    if (!solvent) success = false;
    years.push({ year, age, postTax, taxDeferred, nonDrawable, totalAssets, solvent });

    // Advance the inflation path for next year.
    cumInflation *= 1 + infl;
  }

  return { years, success };
}
