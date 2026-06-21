/**
 * Allocation, drift, and rebalancing (E7-S2/S3, decision 99d5cbfb). Classify
 * holdings into asset classes, compute current allocation, compare to a user-set
 * target (drift), and suggest simple trades back to target. No optimization, no
 * tax-aware lot logic in v1. Pure + unit-tested.
 */
export type AssetClass = "us_equity" | "intl_equity" | "bonds" | "cash" | "real_estate" | "other";

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  us_equity: "US Equity",
  intl_equity: "Intl Equity",
  bonds: "Bonds",
  cash: "Cash",
  real_estate: "Real Estate",
  other: "Other",
};

/** Small built-in symbol → class map for common ETFs/funds; unknown → "other". */
const SYMBOL_CLASS: Record<string, AssetClass> = {
  VTI: "us_equity", VOO: "us_equity", SPY: "us_equity", ITOT: "us_equity", SCHB: "us_equity",
  VXUS: "intl_equity", VEU: "intl_equity", IXUS: "intl_equity", VEA: "intl_equity", VWO: "intl_equity",
  BND: "bonds", AGG: "bonds", BNDX: "bonds", VCIT: "bonds", TLT: "bonds",
  VNQ: "real_estate", SCHH: "real_estate",
  VMFXX: "cash", SPAXX: "cash", CASH: "cash",
};

export function classifyHolding(symbol: string): AssetClass {
  return SYMBOL_CLASS[symbol.toUpperCase()] ?? "other";
}

export interface ClassAllocation {
  assetClass: AssetClass;
  value: number;
  /** Fraction 0–1 of the portfolio. */
  current: number;
  /** Target fraction 0–1 (0 if none set). */
  target: number;
  /** current − target (positive = overweight). */
  drift: number;
}

export interface Holding {
  symbol: string;
  marketValue: number;
}

/** Current allocation per class joined with the user's target, with drift. */
export function computeAllocation(
  holdings: Holding[],
  target: Partial<Record<AssetClass, number>> = {},
): { rows: ClassAllocation[]; total: number } {
  const byClass = new Map<AssetClass, number>();
  for (const h of holdings) {
    const c = classifyHolding(h.symbol);
    byClass.set(c, (byClass.get(c) ?? 0) + h.marketValue);
  }
  const total = [...byClass.values()].reduce((s, v) => s + v, 0);

  // Union of classes that appear in holdings OR have a target set.
  const classes = new Set<AssetClass>([
    ...byClass.keys(),
    ...(Object.keys(target) as AssetClass[]),
  ]);

  const rows = [...classes].map((assetClass) => {
    const value = byClass.get(assetClass) ?? 0;
    const current = total > 0 ? value / total : 0;
    const t = target[assetClass] ?? 0;
    return { assetClass, value, current, target: t, drift: current - t };
  });
  rows.sort((a, b) => b.value - a.value);
  return { rows, total };
}

export interface RebalanceSuggestion {
  assetClass: AssetClass;
  /** Positive = buy this much; negative = sell. */
  amount: number;
}

/**
 * Dollar trades to move each class from its current value to its target weight of
 * the (unchanged) total. Suggestions net to ~0. Trades below `threshold` are
 * dropped as noise.
 */
export function rebalanceSuggestions(
  rows: ClassAllocation[],
  total: number,
  threshold = 100,
): RebalanceSuggestion[] {
  if (total <= 0) return [];
  return rows
    .filter((r) => r.target > 0 || r.value > 0)
    .map((r) => ({ assetClass: r.assetClass, amount: r.target * total - r.value }))
    .filter((s) => Math.abs(s.amount) >= threshold)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}
