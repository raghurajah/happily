"use client";

import { useState } from "react";

import { Button, Field, Input, Select } from "@/components/ui";
import type { ScenarioAssumptions } from "@/db/schema";

type Person = { id: string; name: string };

export type ScenarioFormValues = {
  id?: string;
  name: string;
  assumptions: ScenarioAssumptions;
};

const pct = (x: number) => (x * 100).toString();

export function ScenarioForm({
  action,
  persons,
  defaultExpenses,
  scenario,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  persons: Person[];
  defaultExpenses: number;
  scenario?: ScenarioFormValues;
  submitLabel: string;
}) {
  const a = scenario?.assumptions;
  const initialStrategy = a?.withdrawal.strategy ?? "post_tax_first";
  const [strategy, setStrategy] = useState(initialStrategy);
  const blendPoints =
    a?.withdrawal.strategy === "blend" ? a.withdrawal.controlPoints : [{ age: 65, postTaxPct: 1 }];

  return (
    <form action={action} className="flex flex-col gap-5">
      {scenario?.id && <input type="hidden" name="id" value={scenario.id} />}

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Scenario name">
          <Input name="name" defaultValue={scenario?.name ?? ""} required className="w-56" />
        </Field>
      </div>

      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">Retirement ages</h3>
        <div className="flex flex-wrap gap-3">
          {persons.map((p) => (
            <Field key={p.id} label={p.name}>
              <Input
                name={`retire-${p.id}`}
                type="number"
                defaultValue={a?.retirementAges[p.id] ?? 65}
                className="tnum w-24"
              />
            </Field>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <Field label="Annual expenses (today's $)">
          <Input
            name="annualExpenses"
            type="number"
            step={1000}
            defaultValue={a?.annualExpenses ?? defaultExpenses}
            className="tnum w-40"
          />
        </Field>
        <Field label="Life expectancy (age)">
          <Input name="lifeExpectancy" type="number" defaultValue={a?.lifeExpectancy ?? 92} className="tnum w-28" />
        </Field>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
          Market assumptions (% per year)
        </h3>
        <div className="flex flex-wrap gap-3">
          <Field label="Return mean">
            <Input name="returnMean" type="number" step={0.01} defaultValue={a ? pct(a.returnMean) : "9.51"} className="tnum w-24" />
          </Field>
          <Field label="Return SD">
            <Input name="returnSd" type="number" step={0.01} defaultValue={a ? pct(a.returnSd) : "7.04"} className="tnum w-24" />
          </Field>
          <Field label="Inflation mean">
            <Input name="inflationMean" type="number" step={0.01} defaultValue={a ? pct(a.inflationMean) : "3.7"} className="tnum w-24" />
          </Field>
          <Field label="Inflation SD">
            <Input name="inflationSd" type="number" step={0.01} defaultValue={a ? pct(a.inflationSd) : "2.8"} className="tnum w-24" />
          </Field>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <Field label="Filing status">
          <Select name="filingStatus" defaultValue={a?.tax.filingStatus ?? "married_joint"}>
            <option value="married_joint">Married filing jointly</option>
            <option value="single">Single</option>
          </Select>
        </Field>
        <Field label="State tax rate (%)">
          <Input name="stateRate" type="number" step={0.1} defaultValue={a ? pct(a.tax.stateRate) : "0"} className="tnum w-24" />
        </Field>
      </section>

      <section>
        <Field label="Withdrawal strategy">
          <Select name="withdrawalType" value={strategy} onChange={(e) => setStrategy(e.target.value as typeof strategy)}>
            <option value="post_tax_first">Post-tax first</option>
            <option value="tax_deferred_first">Tax-deferred first</option>
            <option value="blend">Blend schedule</option>
          </Select>
        </Field>
        {strategy === "blend" && (
          <div className="mt-3 rounded-md border border-line p-3">
            <p className="mb-2 text-xs text-faint">
              Control points: at each age, what % of spending comes from post-tax (interpolated between).
            </p>
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((i) => {
                const cp = blendPoints[i];
                return (
                  <div key={i} className="flex items-end gap-3">
                    <Field label="Age">
                      <Input name={`blendAge-${i}`} type="number" defaultValue={cp?.age ?? ""} className="tnum w-24" />
                    </Field>
                    <Field label="Post-tax %">
                      <Input
                        name={`blendPct-${i}`}
                        type="number"
                        defaultValue={cp ? pct(cp.postTaxPct) : ""}
                        className="tnum w-24"
                      />
                    </Field>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <div>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
