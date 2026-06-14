import { asc, eq } from "drizzle-orm";

import { Button, Card, Field, Input, Select } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { StreamForm } from "@/components/stream-form";
import { db } from "@/db";
import { assets, contributions, households, incomeStreams, persons } from "@/db/schema";
import { addPerson, deletePerson, updateHousehold, updatePerson } from "@/lib/actions/household";
import {
  addContribution,
  addStream,
  deleteContribution,
  deleteStream,
} from "@/lib/actions/streams";
import { availabilitySummary, bucketLabel, formatUsd } from "@/lib/format";
import { requireHousehold } from "@/lib/session";

export default async function HouseholdPage() {
  const { householdId } = await requireHousehold();
  const household = (await db.select().from(households).where(eq(households.id, householdId)))[0];
  const [people, assetRows, streams, contribs] = await Promise.all([
    db.select().from(persons).where(eq(persons.householdId, householdId)).orderBy(asc(persons.birthYear)),
    db.select().from(assets).where(eq(assets.householdId, householdId)).orderBy(asc(assets.name)),
    db.select().from(incomeStreams).where(eq(incomeStreams.householdId, householdId)),
    db.select().from(contributions).where(eq(contributions.householdId, householdId)),
  ]);
  const ownerName = new Map<string, string>([
    ...people.map((p) => [p.id, p.name] as const),
    ...assetRows.map((a) => [a.id, a.name] as const),
  ]);

  return (
    <>
      <PageHeader
        title="Household"
        subtitle="Persons, income streams, contributions, and members."
      />

      <div className="flex flex-col gap-6">
        {/* Household settings */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Settings</h2>
          <form action={updateHousehold} className="flex flex-wrap items-end gap-4">
            <Field label="Household name">
              <Input name="name" defaultValue={household?.name ?? ""} required />
            </Field>
            <Field label="Annual expenses (today's $)" hint="Household spending, inflation-adjusted">
              <Input
                name="annualExpenses"
                type="number"
                min={0}
                step={1000}
                defaultValue={household?.annualExpenses ?? ""}
                className="tnum w-48"
              />
            </Field>
            <Button type="submit">Save</Button>
          </form>
        </Card>

        {/* Persons */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Persons</h2>

          {people.length === 0 ? (
            <p className="mb-4 text-sm text-faint">No persons yet — add the household members below.</p>
          ) : (
            <ul className="mb-5 flex flex-col divide-y divide-line">
              {people.map((p) => (
                <li key={p.id} className="flex flex-wrap items-end gap-3 py-3">
                  <form action={updatePerson} className="flex flex-wrap items-end gap-3">
                    <input type="hidden" name="id" value={p.id} />
                    <Field label="Name">
                      <Input name="name" defaultValue={p.name} required className="w-44" />
                    </Field>
                    <Field label="Birth year">
                      <Input
                        name="birthYear"
                        type="number"
                        defaultValue={p.birthYear}
                        required
                        className="tnum w-28"
                      />
                    </Field>
                    <Button type="submit" variant="ghost">
                      Update
                    </Button>
                  </form>
                  <form action={deletePerson}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button type="submit" variant="danger">
                      Remove
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form action={addPerson} className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
            <Field label="Name">
              <Input name="name" placeholder="Person name" required className="w-44" />
            </Field>
            <Field label="Birth year">
              <Input name="birthYear" type="number" placeholder="1972" required className="tnum w-28" />
            </Field>
            <Button type="submit">Add person</Button>
          </form>
        </Card>

        {/* Income streams */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Income streams
          </h2>
          {streams.length === 0 ? (
            <p className="mb-4 text-sm text-faint">
              No streams — add Social Security, pensions, rental income, etc.
            </p>
          ) : (
            <ul className="mb-5 flex flex-col divide-y divide-line">
              {streams.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <span className="font-medium text-ink">{s.name}</span>
                    <span className="ml-2 text-xs text-faint">
                      {ownerName.get(s.personId ?? s.assetId ?? "") ?? "?"} ·{" "}
                      {availabilitySummary(s.availability)}
                      {s.cola ? " · COLA" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tnum text-sm text-ink">{formatUsd(s.annualAmount)}/yr</span>
                    <form action={deleteStream}>
                      <input type="hidden" name="id" value={s.id} />
                      <Button type="submit" variant="danger">
                        Remove
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-line pt-4">
            <StreamForm action={addStream} persons={people} assets={assetRows} submitLabel="Add stream" />
          </div>
        </Card>

        {/* Contributions */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Contributions
          </h2>
          {contribs.length === 0 ? (
            <p className="mb-4 text-sm text-faint">No contributions — add savings during working years.</p>
          ) : (
            <ul className="mb-5 flex flex-col divide-y divide-line">
              {contribs.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <span className="font-medium text-ink">{c.name}</span>
                    <span className="ml-2 text-xs text-faint">
                      {ownerName.get(c.personId) ?? "?"} · {bucketLabel(c.targetBucket)} ·{" "}
                      {availabilitySummary(c.availability)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tnum text-sm text-ink">{formatUsd(c.annualAmount)}/yr</span>
                    <form action={deleteContribution}>
                      <input type="hidden" name="id" value={c.id} />
                      <Button type="submit" variant="danger">
                        Remove
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form
            action={addContribution}
            className="flex flex-wrap items-end gap-3 border-t border-line pt-4"
          >
            <Field label="Name">
              <Input name="name" placeholder="401(k)" required className="w-32" />
            </Field>
            <Field label="Person">
              <Select name="personId" required>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Annual amount">
              <Input name="annualAmount" type="number" min={0} step={1000} required className="tnum w-32" />
            </Field>
            <Field label="Into bucket">
              <Select name="targetBucket" defaultValue="tax_deferred">
                <option value="tax_deferred">Tax-deferred</option>
                <option value="post_tax">Post-tax</option>
              </Select>
            </Field>
            <Field label="Start year">
              <Input name="startYear" type="number" placeholder="2026" required className="tnum w-24" />
            </Field>
            <Field label="End year" hint="blank = ongoing">
              <Input name="endYear" type="number" className="tnum w-24" />
            </Field>
            <Field label="Exclude years" hint="comma-separated">
              <Input name="excludeYears" placeholder="2030" className="w-28" />
            </Field>
            <Button type="submit">Add contribution</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
