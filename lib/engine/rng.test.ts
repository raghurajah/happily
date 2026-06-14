import { describe, expect, it } from "vitest";
import { SeededRng } from "./rng.js";

describe("SeededRng", () => {
  it("is deterministic: same seed → same sequence", () => {
    const a = new SeededRng(42);
    const b = new SeededRng(42);
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("different seeds → different sequences", () => {
    const a = new SeededRng(1);
    const b = new SeededRng(2);
    expect(a.next()).not.toEqual(b.next());
  });

  it("uniform draws are in [0,1)", () => {
    const r = new SeededRng(7);
    for (let i = 0; i < 1000; i++) {
      const x = r.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("normal draws approximate the requested mean and sd", () => {
    const r = new SeededRng(123);
    const n = 50_000;
    const xs = Array.from({ length: n }, () => r.normal(0.0951, 0.0704));
    const mean = xs.reduce((s, x) => s + x, 0) / n;
    const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
    const sd = Math.sqrt(variance);
    expect(mean).toBeCloseTo(0.0951, 2);
    expect(sd).toBeCloseTo(0.0704, 2);
  });

  it("normal draws are uncapped (produce values well above mean+2sd)", () => {
    const r = new SeededRng(9);
    const xs = Array.from({ length: 50_000 }, () => r.normal(0.0951, 0.0704));
    // Excel capped returns at +20%; our distribution must exceed that.
    expect(Math.max(...xs)).toBeGreaterThan(0.2);
  });
});
