/** Shared display formatters. */

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatUsd(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return usd0.format(n);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

const BUCKET_LABELS: Record<string, string> = {
  post_tax: "Post-tax",
  tax_deferred: "Tax-deferred",
  non_drawable: "Non-drawable",
};

export function bucketLabel(bucket: string): string {
  return BUCKET_LABELS[bucket] ?? bucket;
}

type Availability = {
  ranges: Array<{ startYear: number; endYear: number | null }>;
  excludeYears: number[];
};

/** Human summary of a year-availability window, e.g. "2034–lifelong, excl. 2040". */
export function availabilitySummary(a: Availability): string {
  const ranges = a.ranges
    .map((r) => `${r.startYear}–${r.endYear ?? "lifelong"}`)
    .join(", ");
  const excl = a.excludeYears.length ? `, excl. ${a.excludeYears.join(", ")}` : "";
  return `${ranges}${excl}`;
}
