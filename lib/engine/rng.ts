/**
 * Seeded, injectable randomness (decision 71b1665b): identical seed → identical
 * draws → identical Forecast. NO Math.random / Date.now anywhere in the engine.
 */

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** A standard-normal draw, scaled to N(mean, sd). */
  normal(mean: number, sd: number): number;
}

/** mulberry32 — tiny, fast, well-distributed 32-bit PRNG. Deterministic from a seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seeded Rng with Box–Muller normal draws. Each draw consumes two uniforms (we
 * keep one spare so successive normals stay cheap and fully determined by seed).
 */
export class SeededRng implements Rng {
  private readonly u: () => number;
  private spare: number | null = null;

  constructor(seed: number) {
    this.u = mulberry32(seed);
  }

  next(): number {
    return this.u();
  }

  normal(mean = 0, sd = 1): number {
    if (this.spare !== null) {
      const z = this.spare;
      this.spare = null;
      return mean + sd * z;
    }
    // Box–Muller: two uniforms → two independent standard normals.
    let u1 = this.u();
    const u2 = this.u();
    if (u1 < 1e-12) u1 = 1e-12; // guard log(0)
    const r = Math.sqrt(-2 * Math.log(u1));
    const theta = 2 * Math.PI * u2;
    this.spare = r * Math.sin(theta);
    return mean + sd * (r * Math.cos(theta));
  }
}
