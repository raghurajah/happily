/**
 * Trial runner (decisions 913da4c1, 71b1665b): run N independent seeded trials,
 * reduce to per-year percentile bands of total assets and a per-age success
 * probability (cumulative survival — "did the money last through this age?").
 * Deterministic: the same input + seed + trial count reproduce the Forecast.
 */
import { SeededRng } from "./rng";
import { buildHooks } from "./hooks";
import { simulateTrial } from "./simulate";
import { youngestBirthYear } from "./availability";
import type { EngineInput } from "./types";

export interface ForecastBand {
  year: number;
  age: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface SuccessPoint {
  year: number;
  age: number;
  /** Fraction of trials still solvent through this age (0..1). */
  probability: number;
}

export interface ForecastResult {
  bands: ForecastBand[];
  successCurve: SuccessPoint[];
  /** Headline: probability of not running out of money through life expectancy. */
  successProbability: number;
  trials: number;
  seed: number;
}

export interface RunOptions {
  trials?: number;
  seed?: number;
}

/** Deterministic per-trial seed from the base seed + trial index. */
function trialSeed(seed: number, i: number): number {
  return (Math.imul(seed, 1_000_003) + i + 1) >>> 0;
}

/** Linear-interpolated quantile over an ascending-sorted array. */
function quantile(sorted: Float64Array, p: number): number {
  const n = sorted.length;
  if (n === 1) return sorted[0];
  const idx = p * (n - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

export function runForecast(input: EngineInput, opts: RunOptions = {}): ForecastResult {
  const trials = opts.trials ?? 10_000;
  const seed = opts.seed ?? 12345;
  const hooks = buildHooks(input);

  const youngestBY = youngestBirthYear(input.persons);
  const lastYear = youngestBY + input.lifeExpectancy;
  const numYears = lastYear - input.startYear + 1;

  // Per-year column of total assets across trials, and a per-year alive counter.
  const totals: Float64Array[] = Array.from({ length: numYears }, () => new Float64Array(trials));
  const aliveCount = new Int32Array(numYears);

  for (let t = 0; t < trials; t++) {
    const rng = new SeededRng(trialSeed(seed, t));
    const { years } = simulateTrial(input, rng, hooks);
    let failed = false;
    for (let y = 0; y < numYears; y++) {
      const ys = years[y];
      if (!ys.solvent) failed = true;
      if (!failed) aliveCount[y]++;
      totals[y][t] = ys.totalAssets;
    }
  }

  const bands: ForecastBand[] = [];
  const successCurve: SuccessPoint[] = [];
  for (let y = 0; y < numYears; y++) {
    const year = input.startYear + y;
    const age = year - youngestBY;
    const col = totals[y];
    col.sort();
    bands.push({
      year,
      age,
      p10: quantile(col, 0.1),
      p25: quantile(col, 0.25),
      p50: quantile(col, 0.5),
      p75: quantile(col, 0.75),
      p90: quantile(col, 0.9),
    });
    successCurve.push({ year, age, probability: aliveCount[y] / trials });
  }

  return {
    bands,
    successCurve,
    successProbability: successCurve[numYears - 1]?.probability ?? 0,
    trials,
    seed,
  };
}
