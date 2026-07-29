"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { inviteAdvisor } from "./actions";

export function InviteAdvisorForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [arNumber, setArNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleInvite() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    const result = await inviteAdvisor(email, arNumber);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess(`Invite sent to ${email}.`);
    setEmail("");
    setArNumber("");
    router.refresh();
  }

  return (
    <div className="mb-8 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-sm font-medium">Add an advisor</p>
      <p className="mt-1 text-xs text-neutral-500">
        Sends an email invite so they can set a password and access their own dashboard.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="advisor@example.com"
          disabled={busy}
          className="w-64 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        />
        <input
          value={arNumber}
          onChange={(e) => setArNumber(e.target.value)}
          placeholder="AR number, e.g. 1234567"
          inputMode="numeric"
          disabled={busy}
          className="w-44 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        />
        <button
          onClick={handleInvite}
          disabled={busy || email.trim().length === 0 || arNumber.trim().length === 0}
          className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {busy ? "Sending..." : "Send invite"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {success && <p className="mt-2 text-xs text-green-600">{success}</p>}
    </div>
  );
}
