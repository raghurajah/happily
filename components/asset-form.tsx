"use client";

import { useState } from "react";

import { Button, Field, Input, Select } from "@/components/ui";

type Person = { id: string; name: string };
type AssetValues = {
  id?: string;
  name: string;
  kind: "synced" | "manual";
  bucket: "post_tax" | "tax_deferred" | "non_drawable";
  manualValue: string | null;
  growthRate: string | null;
  ownerIds: string[];
};

export function AssetForm({
  action,
  persons,
  asset,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  persons: Person[];
  asset?: AssetValues;
  submitLabel: string;
}) {
  const [kind, setKind] = useState<"synced" | "manual">(asset?.kind ?? "manual");

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      {asset?.id && <input type="hidden" name="id" value={asset.id} />}
      <Field label="Name">
        <Input name="name" defaultValue={asset?.name ?? ""} required className="w-44" />
      </Field>
      <Field label="Kind">
        <Select
          name="kind"
          defaultValue={kind}
          onChange={(e) => setKind(e.target.value as "synced" | "manual")}
        >
          <option value="manual">Manual</option>
          <option value="synced">Synced (E*TRADE)</option>
        </Select>
      </Field>
      <Field label="Bucket">
        <Select name="bucket" defaultValue={asset?.bucket ?? "post_tax"}>
          <option value="post_tax">Post-tax</option>
          <option value="tax_deferred">Tax-deferred</option>
          <option value="non_drawable">Non-drawable</option>
        </Select>
      </Field>
      {kind === "manual" && (
        <>
          <Field label="Current value">
            <Input
              name="manualValue"
              type="number"
              min={0}
              step={1000}
              defaultValue={asset?.manualValue ?? ""}
              className="tnum w-36"
              required
            />
          </Field>
          <Field label="Growth rate" hint="e.g. 0.03 = 3%/yr (optional)">
            <Input
              name="growthRate"
              type="number"
              step={0.005}
              defaultValue={asset?.growthRate ?? ""}
              className="tnum w-28"
            />
          </Field>
        </>
      )}
      {persons.length > 0 && (
        <fieldset className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Owners</span>
          <div className="flex flex-wrap gap-3 pt-1">
            {persons.map((p) => (
              <label key={p.id} className="flex items-center gap-1.5 text-sm text-ink">
                <input
                  type="checkbox"
                  name="ownerIds"
                  value={p.id}
                  defaultChecked={asset?.ownerIds.includes(p.id) ?? false}
                  className="accent-accent"
                />
                {p.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
