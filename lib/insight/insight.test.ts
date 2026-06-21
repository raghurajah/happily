import { describe, expect, it } from "vitest";

import { attributeChange } from "./attribution.js";
import { classifyHolding, computeAllocation, rebalanceSuggestions } from "./allocation.js";

describe("attributeChange (E7-S1)", () => {
  it("splits a pure price move into price effect, zero flow", () => {
    const old = [{ symbol: "VTI", quantity: 100, marketValue: 20_000 }]; // $200
    const now = [{ symbol: "VTI", quantity: 100, marketValue: 22_000 }]; // $220
    const r = attributeChange(old, now);
    expect(r.totalDelta).toBe(2_000);
    expect(r.holdings[0].priceEffect).toBeCloseTo(2_000, 6);
    expect(r.holdings[0].flowEffect).toBeCloseTo(0, 6);
  });

  it("attributes a buy (more shares, same price) to flow", () => {
    const old = [{ symbol: "VTI", quantity: 100, marketValue: 20_000 }];
    const now = [{ symbol: "VTI", quantity: 150, marketValue: 30_000 }]; // still $200
    const r = attributeChange(old, now);
    expect(r.holdings[0].priceEffect).toBeCloseTo(0, 6);
    expect(r.holdings[0].flowEffect).toBeCloseTo(10_000, 6);
  });

  it("price + flow decomposition sums to ΔMV", () => {
    const old = [{ symbol: "AAPL", quantity: 50, marketValue: 9_000 }]; // $180
    const now = [{ symbol: "AAPL", quantity: 60, marketValue: 12_000 }]; // $200
    const r = attributeChange(old, now);
    const h = r.holdings[0];
    expect(h.priceEffect + h.flowEffect).toBeCloseTo(h.deltaValue, 6);
    expect(h.deltaValue).toBe(3_000);
  });

  it("handles opened and closed positions", () => {
    const old = [{ symbol: "OLD", quantity: 10, marketValue: 1_000 }];
    const now = [{ symbol: "NEW", quantity: 5, marketValue: 600 }];
    const r = attributeChange(old, now);
    const closed = r.holdings.find((h) => h.symbol === "OLD")!;
    const opened = r.holdings.find((h) => h.symbol === "NEW")!;
    expect(closed.flowEffect).toBeCloseTo(-1_000, 6); // sold out
    expect(opened.flowEffect).toBeCloseTo(600, 6); // bought in
    expect(r.totalDelta).toBe(-400);
  });
});

describe("allocation + rebalance (E7-S2/S3)", () => {
  it("classifies common symbols, unknowns → other", () => {
    expect(classifyHolding("vti")).toBe("us_equity");
    expect(classifyHolding("BND")).toBe("bonds");
    expect(classifyHolding("ZZZZ")).toBe("other");
  });

  it("computes current allocation and drift vs target", () => {
    const holdings = [
      { symbol: "VTI", marketValue: 60_000 },
      { symbol: "BND", marketValue: 40_000 },
    ];
    const { rows, total } = computeAllocation(holdings, { us_equity: 0.5, bonds: 0.5 });
    expect(total).toBe(100_000);
    const eq = rows.find((r) => r.assetClass === "us_equity")!;
    expect(eq.current).toBeCloseTo(0.6);
    expect(eq.drift).toBeCloseTo(0.1); // 10% overweight equity
  });

  it("suggests trades that net to ~0 and respect the threshold", () => {
    const holdings = [
      { symbol: "VTI", marketValue: 60_000 },
      { symbol: "BND", marketValue: 40_000 },
    ];
    const { rows, total } = computeAllocation(holdings, { us_equity: 0.5, bonds: 0.5 });
    const sugg = rebalanceSuggestions(rows, total);
    const eq = sugg.find((s) => s.assetClass === "us_equity")!;
    const bond = sugg.find((s) => s.assetClass === "bonds")!;
    expect(eq.amount).toBeCloseTo(-10_000); // sell equity
    expect(bond.amount).toBeCloseTo(10_000); // buy bonds
    expect(eq.amount + bond.amount).toBeCloseTo(0, 6);
  });

  it("drops sub-threshold noise trades", () => {
    const holdings = [{ symbol: "VTI", marketValue: 50_050 }, { symbol: "BND", marketValue: 49_950 }];
    const { rows, total } = computeAllocation(holdings, { us_equity: 0.5, bonds: 0.5 });
    expect(rebalanceSuggestions(rows, total, 100)).toHaveLength(0); // ±50 each, below 100
  });
});
