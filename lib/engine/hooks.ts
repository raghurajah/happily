/**
 * Build the per-trial tax + RMD hooks (E3-S2) from an EngineInput, wiring the
 * federal/state tax model and the Uniform Lifetime Table RMD floor into the
 * simulation's marked seams.
 */
import { requiredMinimumDistribution } from "./rmd";
import type { TrialHooks } from "./simulate";
import { computeIncomeTax } from "./tax";
import type { EngineInput } from "./types";

export function buildHooks(input: EngineInput): TrialHooks {
  return {
    computeTax: (ordinaryIncome, cumInflation) =>
      computeIncomeTax(ordinaryIncome, input.tax, cumInflation),
    rmdFloor: (year, taxDeferred) =>
      requiredMinimumDistribution(input.persons, year, taxDeferred),
  };
}
