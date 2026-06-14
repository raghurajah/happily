/**
 * Pure tracking math (no I/O) — split from tracking.ts so it is unit-testable
 * without a database. Holds the achieved-percentile interpolation (E5-S2) and
 * date→decimal-year placement.
 */
import type { ForecastBand } from "@/db/schema";

/** Decimal calendar year for placing a snapshot date on the year axis. */
export function decimalYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1).getTime();
  const next = new Date(d.getFullYear() + 1, 0, 1).getTime();
  return d.getFullYear() + (d.getTime() - start) / (next - start);
}

/** Interpolate the percentile (0–100) of `value` against the 5 band points for a year. */
export function achievedPercentile(band: ForecastBand, value: number): number {
  const pts: [number, number][] = [
    [10, band.p10],
    [25, band.p25],
    [50, band.p50],
    [75, band.p75],
    [90, band.p90],
  ];
  if (value <= pts[0][1]) return pts[0][1] === 0 ? 0 : Math.max(0, (value / pts[0][1]) * 10);
  if (value >= pts[4][1]) return Math.min(100, 90 + ((value - pts[4][1]) / pts[4][1]) * 10);
  for (let i = 0; i < pts.length - 1; i++) {
    const [pa, va] = pts[i];
    const [pb, vb] = pts[i + 1];
    if (value >= va && value <= vb) {
      const t = vb === va ? 0 : (value - va) / (vb - va);
      return pa + t * (pb - pa);
    }
  }
  return 50;
}
