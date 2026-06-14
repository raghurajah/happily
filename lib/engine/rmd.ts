/**
 * Required Minimum Distributions (decision b10161a1): the IRS Uniform Lifetime
 * Table applied to the tax-deferred bucket once a person reaches their RMD start
 * age. The RMD is withdrawn and taxed as ordinary income; any excess over the
 * year's spending need is reinvested post-tax (handled in simulate.ts).
 */
import type { PersonInput } from "./types";

/** IRS Uniform Lifetime Table divisors (2022+), age → distribution period. */
const UNIFORM_LIFETIME: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
  80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4,
  88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
  96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2,
  104: 4.9, 105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4,
  112: 3.3, 113: 3.1, 114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3,
  120: 2.0,
};

const MIN_DIVISOR = 2.0;

/** RMD start age by birth year, per current law (decision b10161a1: 73/75). */
export function rmdStartAge(birthYear: number): number {
  return birthYear < 1960 ? 73 : 75;
}

function divisorForAge(age: number): number {
  if (age <= 72) return UNIFORM_LIFETIME[72];
  if (age >= 120) return MIN_DIVISOR;
  return UNIFORM_LIFETIME[age] ?? MIN_DIVISOR;
}

/**
 * The binding RMD floor on the tax-deferred bucket for `year`. With a single
 * household tax-deferred bucket, the OLDER person past their start age gives the
 * larger (smaller-divisor) requirement, so we take the max across persons.
 */
export function requiredMinimumDistribution(
  persons: PersonInput[],
  year: number,
  taxDeferredBalance: number,
): number {
  if (taxDeferredBalance <= 0) return 0;
  let floor = 0;
  for (const p of persons) {
    const age = year - p.birthYear;
    if (age >= rmdStartAge(p.birthYear)) {
      floor = Math.max(floor, taxDeferredBalance / divisorForAge(age));
    }
  }
  return floor;
}
