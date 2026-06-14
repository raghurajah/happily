import { asc, eq } from "drizzle-orm";
import Link from "next/link";

import { PageHeader, EmptyState } from "@/components/page-header";
import { ScenarioForm } from "@/components/scenario-form";
import { Card } from "@/components/ui";
import { db } from "@/db";
import { households, persons, scenarios } from "@/db/schema";
import { createScenario } from "@/lib/actions/scenarios";
import { requireHousehold } from "@/lib/session";

export default async function ScenariosPage() {
  const { householdId } = await requireHousehold();
  const [household, people, scenarioRows] = await Promise.all([
    db.select().from(households).where(eq(households.id, householdId)).then((r) => r[0]),
    db.select().from(persons).where(eq(persons.householdId, householdId)).orderBy(asc(persons.birthYear)),
    db.select().from(scenarios).where(eq(scenarios.householdId, householdId)).orderBy(asc(scenarios.createdAt)),
  ]);
  const defaultExpenses = Number(household?.annualExpenses ?? 0);

  return (
    <>
      <PageHeader
        title="Scenarios"
        subtitle="Assumption sets you run into Forecasts. One is the active Plan."
        actions={
          scenarioRows.length > 0 ? (
            <Link href="/scenarios/compare" className="text-sm text-faint hover:text-accent-strong">
              Compare →
            </Link>
          ) : undefined
        }
      />

      {people.length === 0 && (
        <EmptyState>Add household persons first — scenarios set a retirement age per person.</EmptyState>
      )}

      <div className="flex flex-col gap-6">
        {scenarioRows.length > 0 && (
          <Card>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
              {scenarioRows.length} scenario{scenarioRows.length === 1 ? "" : "s"}
            </h2>
            <ul className="flex flex-col divide-y divide-line">
              {scenarioRows.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/scenarios/${s.id}`} className="font-medium text-ink hover:text-accent-strong">
                      {s.name}
                    </Link>
                    {s.isPlan && (
                      <span className="rounded bg-accent-dim px-2 py-0.5 text-xs text-accent-strong">
                        Active Plan
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-faint">
                    expenses ${Number(s.assumptions.annualExpenses).toLocaleString()} · to age{" "}
                    {s.assumptions.lifeExpectancy}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {people.length > 0 && (
          <Card>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">New scenario</h2>
            <ScenarioForm
              action={createScenario}
              persons={people}
              defaultExpenses={defaultExpenses}
              submitLabel="Create scenario"
            />
          </Card>
        )}
      </div>
    </>
  );
}
