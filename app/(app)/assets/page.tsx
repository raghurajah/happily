import { asc, eq, inArray } from "drizzle-orm";

import { AssetForm } from "@/components/asset-form";
import { CsvImport } from "@/components/csv-import";
import { EtradeConnect } from "@/components/etrade-connect";
import { Button, Card, Field, Input } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { assetOwners, assets, persons, snapshots } from "@/db/schema";
import { addAsset, deleteAsset, updateAsset } from "@/lib/actions/assets";
import { getEtradeStatus } from "@/lib/actions/etrade";
import { recordBalances } from "@/lib/actions/snapshots";
import { bucketLabel, formatUsd } from "@/lib/format";
import { getAttribution } from "@/lib/insight/queries";
import { requireHousehold } from "@/lib/session";

export default async function AssetsPage() {
  const { householdId } = await requireHousehold();
  const today = new Date().toISOString().slice(0, 10);
  const etradeStatus = await getEtradeStatus(householdId);
  const attribution = await getAttribution(householdId);

  const [people, assetRows] = await Promise.all([
    db.select().from(persons).where(eq(persons.householdId, householdId)).orderBy(asc(persons.birthYear)),
    db.select().from(assets).where(eq(assets.householdId, householdId)).orderBy(asc(assets.name)),
  ]);

  const assetIds = assetRows.map((a) => a.id);
  const owners = assetIds.length
    ? await db.select().from(assetOwners).where(inArray(assetOwners.assetId, assetIds))
    : [];
  const snaps = assetIds.length
    ? await db.select().from(snapshots).where(inArray(snapshots.assetId, assetIds))
    : [];

  // Latest snapshot balance per asset (for synced assets).
  const latestByAsset = new Map<string, { balance: string; asOf: Date }>();
  for (const s of snaps) {
    const cur = latestByAsset.get(s.assetId);
    if (!cur || s.asOf > cur.asOf) latestByAsset.set(s.assetId, { balance: s.balance, asOf: s.asOf });
  }
  const personName = new Map(people.map((p) => [p.id, p.name]));
  const ownersByAsset = new Map<string, string[]>();
  for (const o of owners) {
    const list = ownersByAsset.get(o.assetId) ?? [];
    list.push(o.personId);
    ownersByAsset.set(o.assetId, list);
  }

  function currentValue(a: (typeof assetRows)[number]): string {
    if (a.kind === "manual") return formatUsd(a.manualValue);
    const snap = latestByAsset.get(a.id);
    return snap ? formatUsd(snap.balance) : "Not linked";
  }

  return (
    <>
      <PageHeader title="Assets" subtitle="Accounts and manual assets, with buckets and ownership." />

      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            {assetRows.length} asset{assetRows.length === 1 ? "" : "s"}
          </h2>
          {assetRows.length === 0 ? (
            <p className="text-sm text-faint">No assets yet — add accounts and holdings below.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {assetRows.map((a) => {
                const ownerIds = ownersByAsset.get(a.id) ?? [];
                return (
                  <li key={a.id} className="flex flex-col gap-3 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="font-medium text-ink">{a.name}</span>
                        <span className="ml-3 rounded bg-elevated px-2 py-0.5 text-xs text-muted">
                          {bucketLabel(a.bucket)}
                        </span>
                        <span className="ml-2 text-xs text-faint">
                          {a.kind === "synced" ? "Synced" : "Manual"}
                          {ownerIds.length
                            ? ` · ${ownerIds.map((id) => personName.get(id) ?? "?").join(", ")}`
                            : ""}
                        </span>
                      </div>
                      <span className="tnum text-sm text-ink">{currentValue(a)}</span>
                    </div>
                    <details className="text-sm">
                      <summary className="cursor-pointer text-faint hover:text-accent-strong">Edit</summary>
                      <div className="mt-3 flex flex-wrap items-end gap-3">
                        <AssetForm
                          action={updateAsset}
                          persons={people}
                          submitLabel="Update"
                          asset={{
                            id: a.id,
                            name: a.name,
                            kind: a.kind,
                            bucket: a.bucket,
                            manualValue: a.manualValue,
                            growthRate: a.growthRate,
                            ownerIds,
                          }}
                        />
                        <form action={deleteAsset}>
                          <input type="hidden" name="id" value={a.id} />
                          <Button type="submit" variant="danger">
                            Remove
                          </Button>
                        </form>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Holdings attribution — what moved my number (E7-S1) */}
        {attribution && (
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                What moved my number
              </h2>
              <span className="text-xs text-faint">
                {new Date(attribution.from).toLocaleDateString()} →{" "}
                {new Date(attribution.to).toLocaleDateString()}
              </span>
            </div>
            <div className="mb-4 flex flex-wrap gap-8">
              <div>
                <div className="text-xs uppercase tracking-wide text-faint">Total change</div>
                <div className={`tnum text-lg ${attribution.result.totalDelta >= 0 ? "text-up" : "text-down"}`}>
                  {attribution.result.totalDelta >= 0 ? "+" : ""}
                  {formatUsd(attribution.result.totalDelta)}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-faint">From price</div>
                <div className="tnum text-lg text-ink">{formatUsd(attribution.result.totalPriceEffect)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-faint">From flows</div>
                <div className="tnum text-lg text-ink">{formatUsd(attribution.result.totalFlowEffect)}</div>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-faint">
                  <th className="pb-2">Holding</th>
                  <th className="pb-2">Change</th>
                  <th className="pb-2">Price</th>
                  <th className="pb-2">Flow</th>
                </tr>
              </thead>
              <tbody>
                {attribution.result.holdings
                  .filter((h) => Math.abs(h.deltaValue) > 0.5)
                  .map((h) => (
                    <tr key={h.symbol} className="border-t border-line">
                      <td className="py-2 font-medium text-ink">{h.symbol}</td>
                      <td className={`py-2 tnum ${h.deltaValue >= 0 ? "text-up" : "text-down"}`}>
                        {formatUsd(h.deltaValue)}
                      </td>
                      <td className="py-2 tnum text-muted">{formatUsd(h.priceEffect)}</td>
                      <td className="py-2 tnum text-muted">{formatUsd(h.flowEffect)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Record balances → Snapshots (manual entry + CSV import) */}
        {assetRows.length > 0 && (
          <Card>
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
              Record balances
            </h2>
            <p className="mb-4 text-xs text-faint">
              Each entry or import saves a dated, append-only snapshot — the bridge until E*TRADE sync.
            </p>

            <form action={recordBalances} className="flex flex-col gap-4">
              <Field label="As-of date">
                <Input name="asOf" type="date" defaultValue={today} className="tnum w-44" />
              </Field>
              <div className="flex flex-wrap gap-4">
                {assetRows.map((a) => (
                  <Field key={a.id} label={a.name}>
                    <Input
                      name={`balance-${a.id}`}
                      type="number"
                      step={100}
                      placeholder={a.kind === "manual" ? (a.manualValue ?? "") : "balance"}
                      className="tnum w-40"
                    />
                  </Field>
                ))}
              </div>
              <div>
                <Button type="submit">Save balances</Button>
              </div>
            </form>

            <div className="mt-6 border-t border-line pt-4">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-faint">
                Import E*TRADE CSV
              </h3>
              <CsvImport defaultDate={today} />
            </div>
          </Card>
        )}

        <Card>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">E*TRADE sync</h2>
          <p className="mb-4 text-xs text-faint">
            Read-only balance &amp; position sync. Sandbox until the production key is granted.
          </p>
          <EtradeConnect status={etradeStatus} />
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Add asset</h2>
          <AssetForm action={addAsset} persons={people} submitLabel="Add asset" />
        </Card>
      </div>
    </>
  );
}
