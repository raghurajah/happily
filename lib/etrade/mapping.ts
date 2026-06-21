/**
 * Map an E*TRADE account to a model bucket (decision 8a2f4e15): IRAs / rollover /
 * 401k / Roth / retirement accounts are tax-deferred; everything else is a
 * taxable (post-tax) brokerage account. Pure + unit-tested.
 */
import type { EtradeAccount } from "./client";

export function bucketForAccount(a: Pick<EtradeAccount, "accountType" | "accountDesc">): "post_tax" | "tax_deferred" {
  return /ira|rollover|401|roth|retire/i.test(`${a.accountType} ${a.accountDesc}`)
    ? "tax_deferred"
    : "post_tax";
}
