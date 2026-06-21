import { describe, expect, it } from "vitest";
import { achievedPercentile } from "./tracking-math.js";
import type { ForecastBand } from "@/db/schema";

const band: ForecastBand = {
  year: 2026,
  age: 54,
  p10: 1_000_000,
  p25: 1_500_000,
  p50: 2_000_000,
  p75: 2_500_000,
  p90: 3_000_000,
};

describe("achievedPercentile (E5-S2)", () => {
  it("returns 50 at the median", () => {
    expect(achievedPercentile(band, 2_000_000)).toBeCloseTo(50, 5);
  });

  it("interpolates linearly between band points", () => {
    // halfway between p50 (2.0M) and p75 (2.5M) → 62.5th percentile.
    expect(achievedPercentile(band, 2_250_000)).toBeCloseTo(62.5, 5);
    // halfway between p10 (1.0M) and p25 (1.5M) → 17.5th.
    expect(achievedPercentile(band, 1_250_000)).toBeCloseTo(17.5, 5);
  });

  it("clamps and extrapolates beyond the outer bands", () => {
    expect(achievedPercentile(band, 3_600_000)).toBeGreaterThan(90);
    expect(achievedPercentile(band, 3_600_000)).toBeLessThanOrEqual(100);
    expect(achievedPercentile(band, 500_000)).toBeLessThan(10);
    expect(achievedPercentile(band, 500_000)).toBeGreaterThanOrEqual(0);
  });
});
