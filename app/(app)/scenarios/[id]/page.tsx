import { and, asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { ScenarioForm } from "@/components/scenario-form";
import { Button, Card } from "@/components/ui";
import { db } from "@/db";
import { forecasts, households, persons, scenarios } from "@/db/schema";
import { deleteForecast, runForecastAction } from "@/lib/actions/forecasts";
import { deleteScenario, setActivePlan, updateScenario } from "@/lib/actions/scenarios";
import { formatPercent, formatUsd } from "@/lib/format";
import { requireHousehold } from "@/lib/session";

export default async function ScenarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { householdId } = await requireHousehold();

  const scenario = (
    await db
      .select()
      .from(scenarios)
      .where(and(eq(scenarios.id, id), eq(scenarios.householdId, householdId)))
  )[0];
  if (!scenario) notFound();

  const [household, people, forecastRows] = await Promise.all([
    db.select().from(households).where(eq(households.id, householdId)).then((r) => r[0]),
    db.select().from(persons).where(eq(persons.householdId, householdId)).orderBy(asc(persons.birthYear)),
    db.select().from(forecasts).where(eq(forecasts.scenarioId, id)).orderBy(desc(forecasts.createdAt)),
  ]);

  return (
    <>
      <PageHeader
        title={scenario.name}
        subtitle="Edit the assumption set, then run it into a Forecast."
        actions={
          <div className="flex items-center gap-3">
            {scenario.isPlan ? (
              <span className="rounded bg-accent-dim px-2 py-1 text-xs text-accent-strong">Active Plan</span>
            ) : (
              <form action={setActivePlan}>
                <input type="hidden" name="id" value={scenario.id} />
                <Button type="submit" variant="ghost">
                  Set as Plan
                </Button>
              </form>
            )}
            <Link href="/scenarios" className="text-sm text-faint hover:text-accent-strong">
              ← All scenarios
            </Link>
          </div>
        }
      />

      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Assumptions</h2>
          <ScenarioForm
            action={updateScenario}
            persons={people}
            defaultExpenses={Number(household?.annualExpenses ?? 0)}
            scenario={{ id: scenario.id, name: scenario.name, assumptions: scenario.assumptions }}
            submitLabel="Save changes"
          />
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Forecasts</h2>
            <form action={runForecastAction}>
              <input type="hidden" name="scenarioId" value={scenario.id} />
              <Button type="submit">Run forecast</Button>
            </form>
          </div>
          {forecastRows.length === 0 ? (
            <p className="text-sm text-faint">
              No forecasts yet — run the engine (10k trials) to freeze a Forecast from today&apos;s balances.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {forecastRows.map((f) => {
                const success = Number(
                  (f.startingInputs as { successProbability?: number }).successProbability ??
                    f.successCurve.at(-1)?.probability ??
                    0,
                );
                const finalP50 = f.bands.at(-1)?.p50 ?? 0;
                return (
                  <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="flex items-baseline gap-4">
                      <span className="text-lg font-semibold text-accent-strong tnum">
                        {formatPercent(success)}
                      </span>
                      <span className="text-xs text-faint">success · median end {formatUsd(finalP50)}</span>
                      <span className="text-xs text-faint">
                        {new Date(f.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <form action={deleteForecast}>
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="scenarioId" value={scenario.id} />
                      <Button type="submit" variant="ghost">
                        Delete
                      </Button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Danger zone</h2>
          <form action={deleteScenario}>
            <input type="hidden" name="id" value={scenario.id} />
            <Button type="submit" variant="danger">
              Delete scenario
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
