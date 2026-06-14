import type { Availability } from "./types";

/** Whether a stream/contribution is active in a given calendar year. */
export function isActive(availability: Availability, year: number): boolean {
  if (availability.excludeYears.includes(year)) return false;
  return availability.ranges.some(
    (r) => year >= r.startYear && (r.endYear === null || year <= r.endYear),
  );
}

/** The youngest person's birth year drives the simulation horizon (decision c9da4675). */
export function youngestBirthYear(persons: Array<{ birthYear: number }>): number {
  return Math.max(...persons.map((p) => p.birthYear));
}
