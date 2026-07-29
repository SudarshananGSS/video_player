"use client";

import { useState } from "react";
import { setArNumber } from "./advisor-actions";

export function AdvisorSetup({ arNumber }: { arNumber: string | null }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setBusy(true);
    setError(null);
    const result = await setArNumber(value);
    setBusy(false);
    if (result.error) setError(result.error);
  }

  if (arNumber) {
    const welcomeUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/welcome/${arNumber}`;
    return (
      <div className="mb-8 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Your welcome video link</p>
        <p className="mt-1 text-sm text-neutral-600">
          AR {arNumber} · This link never changes, even if you replace your welcome video. Give it to your Zoho
          admin once to set up the email template.
        </p>
        <input
          readOnly
          value={welcomeUrl}
          onFocus={(e) => e.target.select()}
          className="mt-2 w-full rounded border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-600"
        />
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-900">Set your AR number to get a welcome video link</p>
      <p className="mt-1 text-xs text-amber-700">
        This creates a permanent link (e.g. /welcome/1234567) that Zoho can reference in client welcome emails.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 1234567"
          inputMode="numeric"
          disabled={busy}
          className="w-40 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        />
        <button
          onClick={handleSave}
          disabled={busy || value.trim().length === 0}
          className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
