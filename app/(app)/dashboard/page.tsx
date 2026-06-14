import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui";
import { TrackingChart } from "@/components/tracking-chart";
import { bucketLabel, formatPercent, formatUsd } from "@/lib/format";
import { requireHousehold } from "@/lib/session";
import { buildTrackingData } from "@/lib/tracking";

export const dynamic = "force-dynamic";

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-faint">{label}</div>
      <div className={`tnum text-2xl font-semibold ${accent ? "text-accent-strong" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}

function Staleness({ staleDays }: { staleDays: number | null }) {
  if (staleDays === null) {
    return <span className="text-xs text-faint">No balances recorded yet</span>;
  }
  const stale = staleDays > 35;
  return (
    <span className={`flex items-center gap-1.5 text-xs ${stale ? "text-down" : "text-up"}`}>
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: "currentColor" }} />
      {staleDays === 0 ? "Updated today" : `Updated ${staleDays} day${staleDays === 1 ? "" : "s"} ago`}
    </span>
  );
}

export default async function DashboardPage() {
  const { householdId } = await requireHousehold();
  const t = await buildTrackingData(householdId);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Where you stand against the Plan, and where today's balances point."
        actions={
          <div className="flex items-center gap-4">
            <Staleness staleDays={t.staleDays} />
            <Link href="/assets" className="text-sm text-accent-strong hover:underline">
              Update balances →
            </Link>
          </div>
        }
      />

      {!t.hasPlan ? (
        <EmptyState>
          No active Plan yet. Create a Scenario, run a Forecast, and{" "}
          <Link href="/scenarios" className="text-accent-strong hover:underline">
            set it as your Plan
          </Link>{" "}
          to start tracking.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Headline metrics */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <Stat
                label="Success probability"
                value={formatPercent(t.reforecastSuccess ?? 0)}
                accent
              />
              <p className="mt-1 text-xs text-faint">re-forecast from today&apos;s balances</p>
            </Card>
            <Card>
              <Stat
                label="Achieved percentile"
                value={t.achievedPercentile !== undefined ? `${Math.round(t.achievedPercentile)}th` : "—"}
              />
              <p className="mt-1 text-xs text-faint">vs the Plan&apos;s range today</p>
            </Card>
            <Card>
              <Stat label="Net worth" value={formatUsd(t.netWorth)} />
              <p className="mt-1 text-xs text-faint">all buckets</p>
            </Card>
            <Card>
              <Stat label="Active Plan" value={t.planName ?? "—"} />
              <Link href="/scenarios" className="mt-1 inline-block text-xs text-accent-strong hover:underline">
                view scenarios →
              </Link>
            </Card>
          </div>

          {/* Net worth by bucket */}
          <Card>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Net worth by bucket
            </h2>
            <div className="flex flex-wrap gap-8">
              {(["post_tax", "tax_deferred", "non_drawable"] as const).map((b) => (
                <div key={b}>
                  <div className="text-xs uppercase tracking-wide text-faint">{bucketLabel(b)}</div>
                  <div className="tnum text-lg text-ink">{formatUsd(t.netWorthByBucket[b])}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Three-layer tracking chart */}
          <Card>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Tracking — Plan vs actual vs re-forecast
            </h2>
            <TrackingChart
              planForecastBands={t.planForecastBands}
              reforecastBands={t.reforecastBands}
              actualTrajectory={t.actualTrajectory}
            />
            {!t.planForecastBands && (
              <p className="mt-2 text-xs text-faint">
                Run a Forecast on your Plan scenario to show the Plan bands.
              </p>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
