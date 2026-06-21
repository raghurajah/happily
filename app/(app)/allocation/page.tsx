import { eq } from "drizzle-orm";

import { EmptyState, PageHeader } from "@/components/page-header";
import { Button, Card, Input } from "@/components/ui";
import { db } from "@/db";
import { households } from "@/db/schema";
import { setTargetAllocation } from "@/lib/actions/allocation";
import { formatPercent, formatUsd } from "@/lib/format";
import {
  ASSET_CLASS_LABELS,
  computeAllocation,
  rebalanceSuggestions,
  type AssetClass,
} from "@/lib/insight/allocation";
import { getLatestHoldings } from "@/lib/insight/queries";
import { requireHousehold } from "@/lib/session";

const CLASSES: AssetClass[] = ["us_equity", "intl_equity", "bonds", "cash", "real_estate", "other"];

export default async function AllocationPage() {
  const { householdId } = await requireHousehold();
  const [household, { holdings, asOf }] = await Promise.all([
    db.select().from(households).where(eq(households.id, householdId)).then((r) => r[0]),
    getLatestHoldings(householdId),
  ]);

  const target = household?.targetAllocation ?? {};
  const { rows, total } = computeAllocation(holdings, target);
  const suggestions = rebalanceSuggestions(rows, total);

  return (
    <>
      <PageHeader
        title="Allocation"
        subtitle="Current allocation from positions vs your target, with drift and simple rebalancing."
      />

      <div className="flex flex-col gap-6">
        {holdings.length === 0 ? (
          <EmptyState>
            No position data yet. Connect E*TRADE and sync (Assets) to populate holdings, then set a target here.
          </EmptyState>
        ) : (
          <>
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  Current vs target
                </h2>
                <span className="text-xs text-faint">
                  {formatUsd(total)} · as of {asOf ? new Date(asOf).toLocaleDateString() : "—"}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-faint">
                    <th className="pb-2">Class</th>
                    <th className="pb-2">Value</th>
                    <th className="pb-2">Current</th>
                    <th className="pb-2">Target</th>
                    <th className="pb-2">Drift</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.assetClass} className="border-t border-line">
                      <td className="py-2 text-ink">{ASSET_CLASS_LABELS[r.assetClass]}</td>
                      <td className="py-2 tnum text-muted">{formatUsd(r.value)}</td>
                      <td className="py-2 tnum">{formatPercent(r.current)}</td>
                      <td className="py-2 tnum text-muted">{r.target ? formatPercent(r.target) : "—"}</td>
                      <td
                        className={`py-2 tnum ${Math.abs(r.drift) < 0.02 ? "text-faint" : r.drift > 0 ? "text-up" : "text-down"}`}
                      >
                        {r.target ? `${r.drift >= 0 ? "+" : ""}${formatPercent(r.drift)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {suggestions.length > 0 && (
              <Card>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
                  Rebalancing suggestions
                </h2>
                <ul className="flex flex-col gap-2">
                  {suggestions.map((s) => (
                    <li key={s.assetClass} className="flex items-center justify-between text-sm">
                      <span className="text-ink">{ASSET_CLASS_LABELS[s.assetClass]}</span>
                      <span className={`tnum font-medium ${s.amount > 0 ? "text-up" : "text-down"}`}>
                        {s.amount > 0 ? "Buy " : "Sell "}
                        {formatUsd(Math.abs(s.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-faint">
                  Simple drift-to-target moves — no optimization or tax-lot logic in v1.
                </p>
              </Card>
            )}
          </>
        )}

        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Target allocation (%)
          </h2>
          <form action={setTargetAllocation} className="flex flex-wrap items-end gap-3">
            {CLASSES.map((c) => (
              <label key={c} className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted">
                  {ASSET_CLASS_LABELS[c]}
                </span>
                <Input
                  name={`target-${c}`}
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={target[c] !== undefined ? Math.round((target[c] ?? 0) * 100) : ""}
                  className="tnum w-24"
                />
              </label>
            ))}
            <Button type="submit">Save target</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
