/**
 * Tolerant balance-CSV parser for E*TRADE website exports (decision b1ee4eca:
 * CSV import persists dated Snapshots). E*TRADE's exports vary, so rather than
 * hard-coding one layout we detect an account/description column and a
 * value/balance column by header keywords, and parse currency-formatted numbers.
 * Pure + deterministic so it is unit-testable; matching rows to assets happens
 * in the action layer.
 */

export interface ParsedBalanceRow {
  account: string;
  balance: number;
}

export interface ParseResult {
  rows: ParsedBalanceRow[];
  /** Header tokens we could not interpret, for surfacing back to the user. */
  warnings: string[];
}

const ACCOUNT_KEYS = ["account name", "account", "description", "name", "symbol"];
const VALUE_KEYS = ["market value", "value", "balance", "current value", "total value", "amount"];

function splitCsvLine(line: string): string[] {
  // Minimal CSV: handles quoted fields containing commas.
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Parse a currency-formatted cell ("$1,234.56", "(500)", "1234") to a number. */
export function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  if (cleaned === "" || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function findColumn(headers: string[], keys: string[]): number {
  const lower = headers.map((h) => h.toLowerCase());
  for (const key of keys) {
    const idx = lower.findIndex((h) => h === key);
    if (idx !== -1) return idx;
  }
  for (const key of keys) {
    const idx = lower.findIndex((h) => h.includes(key));
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseBalanceCsv(text: string): ParseResult {
  const warnings: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { rows: [], warnings: ["Empty file"] };

  // Find the first row that looks like a header (has both an account and a value column).
  let headerIdx = -1;
  let accountCol = -1;
  let valueCol = -1;
  for (let i = 0; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const a = findColumn(cells, ACCOUNT_KEYS);
    const v = findColumn(cells, VALUE_KEYS);
    if (a !== -1 && v !== -1) {
      headerIdx = i;
      accountCol = a;
      valueCol = v;
      break;
    }
  }
  if (headerIdx === -1) {
    return { rows: [], warnings: ["Could not find account and value columns in the header"] };
  }

  const rows: ParsedBalanceRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const account = cells[accountCol]?.trim();
    const balance = parseMoney(cells[valueCol] ?? "");
    if (!account || balance === null) continue; // skip subtotal/blank rows silently
    rows.push({ account, balance });
  }
  if (rows.length === 0) warnings.push("No data rows with a parseable balance were found");
  return { rows, warnings };
}
