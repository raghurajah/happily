/**
 * Withdrawal strategies (decision 5c68ced9): post-tax-first (default),
 * tax-deferred-first (Excel behaviour), and a time-keyed blend schedule of
 * (age, post-tax %) control points interpolated between points. The RMD floor
 * (E3-S2) is applied BEFORE this in simulate.ts, so it binds under every strategy.
 */
import type { WithdrawalStrategy } from "./types";

export interface Drawable {
  postTax: number;
  taxDeferred: number;
}

export interface Withdrawal {
  fromPost: number;
  fromTaxDeferred: number;
}

/** Post-tax fraction of spending at a given age, from the blend control points. */
export function blendPostTaxFraction(
  controlPoints: Array<{ age: number; postTaxPct: number }>,
  age: number,
): number {
  if (controlPoints.length === 0) return 1;
  const pts = [...controlPoints].sort((a, b) => a.age - b.age);
  if (age <= pts[0].age) return clamp01(pts[0].postTaxPct);
  if (age >= pts[pts.length - 1].age) return clamp01(pts[pts.length - 1].postTaxPct);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (age >= a.age && age <= b.age) {
      const t = (age - a.age) / (b.age - a.age);
      return clamp01(a.postTaxPct + t * (b.postTaxPct - a.postTaxPct));
    }
  }
  return clamp01(pts[pts.length - 1].postTaxPct);
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * How much of `need` to draw from each drawable bucket under `strategy` at `age`.
 * Whatever a strategy's preferred bucket can't cover spills to the other; any
 * residual `need` beyond total drawable signals insolvency (caller detects it).
 */
export function planWithdrawal(
  need: number,
  balances: Drawable,
  strategy: WithdrawalStrategy,
  age: number,
): Withdrawal {
  if (need <= 0) return { fromPost: 0, fromTaxDeferred: 0 };

  if (strategy.type === "post_tax_first") {
    const fromPost = Math.min(balances.postTax, need);
    const fromTaxDeferred = Math.min(balances.taxDeferred, need - fromPost);
    return { fromPost, fromTaxDeferred };
  }

  if (strategy.type === "tax_deferred_first") {
    const fromTaxDeferred = Math.min(balances.taxDeferred, need);
    const fromPost = Math.min(balances.postTax, need - fromTaxDeferred);
    return { fromPost, fromTaxDeferred };
  }

  // blend: split by the age-interpolated post-tax fraction, then spill shortfalls.
  const pct = blendPostTaxFraction(strategy.controlPoints, age);
  let fromPost = Math.min(balances.postTax, need * pct);
  let fromTaxDeferred = Math.min(balances.taxDeferred, need - fromPost);
  // If the tax-deferred side couldn't cover its share, pull more from post-tax.
  const residual = need - fromPost - fromTaxDeferred;
  if (residual > 0) {
    fromPost = Math.min(balances.postTax, fromPost + residual);
  }
  return { fromPost, fromTaxDeferred };
}
