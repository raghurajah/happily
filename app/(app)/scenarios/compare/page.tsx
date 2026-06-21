import { asc, eq } from "drizzle-orm";
import Link from "next/link";

import { ForecastChart, type Line } from "@/components/forecast-chart";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card } from "@/components/ui";
import { db } from "@/db";
import { scenarios } from "@/db/schema";
import { formatPercent, formatUsd } from "@/lib/format";
import { forecastSuccess, latestForecastByScenario } from "@/lib/forecast-queries";
import { requireHousehold } from "@/lib/session";

const PALETTE = ["#c0344e", "#34c98a", "#5b8def", "#e0a13c", "#9b5de5", "#48c9b0"];

export default async function ComparePage() {
  const { householdId } = await requireHousehold();
  const [scenarioRows, latest] = await Promise.all([
    db.select().from(scenarios).where(eq(scenarios.householdId, householdId)).orderBy(asc(scenarios.createdAt)),
    latestForecastByScenario(householdId),
  ]);

  const withForecast = scenarioRows
    .map((s, i) => ({ scenario: s, forecast: latest.get(s.id), color: PALETTE[i % PALETTE.length] }))
    .filter((x) => x.forecast);

  const lines: Line[] = withForecast.map((x) => ({
    label: x.scenario.name,
    color: x.color,
    points: x.forecast!.bands.map((b) => ({ x: b.year, y: b.p50 })),
  }));

  return (
    <>
      <PageHeader
        title="Compare forecasts"
        subtitle="Median (p50) trajectory of each scenario's latest Forecast."
        actions={
          <Link href="/scenarios" className="text-sm text-faint hover:text-accent-strong">
            ← All scenarios
          </Link>
        }
      />

      {withForecast.length === 0 ? (
        <EmptyState>Run a Forecast on at least one scenario to compare.</EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          <Card>
            <ForecastChart lines={lines} height={360} />
          </Card>
          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-faint">
                  <th className="pb-2">Scenario</th>
                  <th className="pb-2">Success</th>
                  <th className="pb-2">Median end</th>
                  <th className="pb-2">Expenses</th>
                </tr>
              </thead>
              <tbody>
                {withForecast.map((x) => (
                  <tr key={x.scenario.id} className="border-t border-line">
                    <td className="py-2">
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-2 w-3 rounded-sm" style={{ background: x.color }} />
                        <Link href={`/scenarios/${x.scenario.id}`} className="text-ink hover:text-accent-strong">
                          {x.scenario.name}
                        </Link>
                        {x.scenario.isPlan && (
                          <span className="rounded bg-accent-dim px-1.5 py-0.5 text-xs text-accent-strong">
                            Plan
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 tnum text-accent-strong">{formatPercent(forecastSuccess(x.forecast!))}</td>
                    <td className="py-2 tnum">{formatUsd(x.forecast!.bands.at(-1)?.p50 ?? 0)}</td>
                    <td className="py-2 tnum text-muted">
                      {formatUsd(x.scenario.assumptions.annualExpenses)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </>
  );
}
