import { describe, expect, it } from "vitest";
import { parseBalanceCsv, parseMoney } from "./csv.js";

describe("parseMoney", () => {
  it("strips currency formatting", () => {
    expect(parseMoney("$1,234.56")).toBe(1234.56);
    expect(parseMoney("1000")).toBe(1000);
    expect(parseMoney("(500)")).toBe(-500); // accounting negative
  });
  it("returns null for blanks and junk", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("--")).toBeNull();
    expect(parseMoney("N/A")).toBeNull();
  });
});

describe("parseBalanceCsv", () => {
  it("parses a typical E*TRADE-style export", () => {
    const csv = [
      "Account Name,Account Number,Market Value",
      "Joint Brokerage,****1234,\"$1,250,000.00\"",
      "Rollover IRA,****5678,\"$980,500.50\"",
      "Total,,\"$2,230,500.50\"", // subtotal-ish row still parses; matching filters it
    ].join("\n");
    const { rows } = parseBalanceCsv(csv);
    expect(rows).toEqual([
      { account: "Joint Brokerage", balance: 1_250_000 },
      { account: "Rollover IRA", balance: 980_500.5 },
      { account: "Total", balance: 2_230_500.5 },
    ]);
  });

  it("tolerates a preamble before the header and alternate column names", () => {
    const csv = [
      "Portfolio export 2026-06-13",
      "",
      "Description,Value",
      "Brokerage,$500000",
      "blank row with no value,",
    ].join("\n");
    const { rows } = parseBalanceCsv(csv);
    expect(rows).toEqual([{ account: "Brokerage", balance: 500_000 }]);
  });

  it("warns when no account/value header is present", () => {
    const { rows, warnings } = parseBalanceCsv("foo,bar\n1,2");
    expect(rows).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
  });
});
