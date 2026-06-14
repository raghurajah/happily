"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui";
import { importBalancesCsv, type ImportState } from "@/lib/actions/snapshots";

const initial: ImportState = { ok: false, imported: 0, skipped: [] };

export function CsvImport({ defaultDate }: { defaultDate: string }) {
  const [state, action, pending] = useActionState(importBalancesCsv, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">As-of date</span>
          <input
            name="asOf"
            type="date"
            defaultValue={defaultDate}
            className="rounded-md border border-line bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
      </div>
      <textarea
        name="csv"
        rows={5}
        placeholder="Paste E*TRADE CSV export here (account/description + value/balance columns)…"
        className="w-full rounded-md border border-line bg-base px-3 py-2 font-mono text-xs text-ink outline-none placeholder:text-faint focus:border-accent"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Importing…" : "Import CSV"}
        </Button>
        {state.error && <span className="text-sm text-down">{state.error}</span>}
        {state.ok && (
          <span className="text-sm text-up">
            Imported {state.imported} balance{state.imported === 1 ? "" : "s"}
            {state.skipped.length > 0 && (
              <span className="text-faint"> · skipped unmatched: {state.skipped.join(", ")}</span>
            )}
          </span>
        )}
      </div>
    </form>
  );
}
