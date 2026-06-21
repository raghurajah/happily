"use client";

import { useState, useTransition } from "react";

import { Button, Input } from "@/components/ui";
import { connectComplete, connectStart, disconnectEtrade, syncNow } from "@/lib/actions/etrade";

type Status = {
  connected: boolean;
  env: string;
  connectedAt: Date | string | null;
  configured: boolean;
};

export function EtradeConnect({ status }: { status: Status }) {
  const [pending, start] = useTransition();
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!status.configured) {
    return (
      <p className="text-sm text-faint">
        E*TRADE isn&apos;t configured on this deployment yet (no consumer key). Until the production
        key is granted, use manual entry or CSV import above — the bridge keeps balances current.
      </p>
    );
  }

  if (status.connected) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm text-up">
          <span className="inline-block h-2 w-2 rounded-full bg-up" />
          Connected ({status.env})
          {status.connectedAt && (
            <span className="text-faint"> · since {new Date(status.connectedAt).toLocaleDateString()}</span>
          )}
        </span>
        <Button type="button" disabled={pending} onClick={() => start(() => syncNow())}>
          {pending ? "Syncing…" : "Sync now"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => start(() => disconnectEtrade())}>
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-faint">
        Connect read-only to E*TRADE ({status.env}). You&apos;ll authorize on E*TRADE and paste the
        verification code back here.
      </p>
      {!authUrl ? (
        <div>
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await connectStart();
                if ("error" in res) setError(res.error);
                else {
                  setAuthUrl(res.url);
                  window.open(res.url, "_blank", "noopener");
                }
              })
            }
          >
            {pending ? "Starting…" : "Connect E*TRADE"}
          </Button>
          {error && <p className="mt-2 text-sm text-down">{error}</p>}
        </div>
      ) : (
        <form action={connectComplete} className="flex flex-wrap items-end gap-3">
          <p className="w-full text-xs text-faint">
            Authorized?{" "}
            <a href={authUrl} target="_blank" rel="noopener" className="text-accent-strong hover:underline">
              Reopen E*TRADE
            </a>{" "}
            and paste the code:
          </p>
          <Input name="verifier" placeholder="Verification code" required className="w-48" />
          <Button type="submit">Finish connecting</Button>
        </form>
      )}
    </div>
  );
}
