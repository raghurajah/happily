"use client";

import { useState } from "react";

import { Button, Field, Input, Select } from "@/components/ui";

type Named = { id: string; name: string };

export function StreamForm({
  action,
  persons,
  assets,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  persons: Named[];
  assets: Named[];
  submitLabel: string;
}) {
  const [ownerKind, setOwnerKind] = useState<"person" | "asset">("person");
  const owners = ownerKind === "person" ? persons : assets;

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <Field label="Name">
        <Input name="name" placeholder="Social Security" required className="w-40" />
      </Field>
      <Field label="Attaches to">
        <Select
          name="ownerKind"
          value={ownerKind}
          onChange={(e) => setOwnerKind(e.target.value as "person" | "asset")}
        >
          <option value="person">Person</option>
          <option value="asset">Asset</option>
        </Select>
      </Field>
      <Field label={ownerKind === "person" ? "Person" : "Asset"}>
        <Select name="ownerId" required>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Annual amount (today's $)">
        <Input name="annualAmount" type="number" min={0} step={1000} required className="tnum w-32" />
      </Field>
      <Field label="Start year">
        <Input name="startYear" type="number" placeholder="2034" required className="tnum w-24" />
      </Field>
      <Field label="End year" hint="blank = lifelong">
        <Input name="endYear" type="number" className="tnum w-24" />
      </Field>
      <Field label="Exclude years" hint="comma-separated">
        <Input name="excludeYears" placeholder="2040, 2041" className="w-32" />
      </Field>
      <label className="flex items-center gap-1.5 pb-2 text-sm text-ink">
        <input type="checkbox" name="cola" className="accent-accent" />
        COLA
      </label>
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
