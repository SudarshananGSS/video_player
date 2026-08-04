"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function parseHashParams() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  return new URLSearchParams(hash);
}

export function SetPasswordClient() {
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const hashParams = parseHashParams();
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashError = hashParams.get("error_description") || hashParams.get("error");

      // The invite link puts the session in the URL hash fragment
      // (#access_token=...&refresh_token=...) rather than a query param, since
      // Supabase's default invite email template can't be customized on this
      // plan. @supabase/ssr's browser client doesn't reliably auto-detect
      // hash-fragment sessions (it's built around cookie/PKCE flows), so we
      // parse it ourselves and set the session explicitly.
      if (accessToken && refreshToken) {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        window.history.replaceState(null, "", window.location.pathname);
        if (sessionError) {
          setLinkError(sessionError.message);
        } else {
          setEmail(data.user?.email ?? null);
        }
        setChecking(false);
        return;
      }

      if (hashError) {
        setLinkError(hashError.replace(/\+/g, " "));
        setChecking(false);
        return;
      }

      // No hash tokens (e.g. page refresh) — fall back to any existing session.
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      setChecking(false);
    }

    init();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    window.location.href = "/dashboard";
  }

  if (checking) {
    return <p className="text-sm text-neutral-400">Checking your invite link...</p>;
  }

  if (!email) {
    return (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {linkError ?? "This invite link is invalid or has expired."} Ask your admin to send a new one.
      </p>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Set your password</h1>
        <p className="text-sm text-neutral-500">{email}</p>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={busy || done}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            disabled={busy || done}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy || done}
          className="w-full rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Saving..." : done ? "Redirecting..." : "Set password and continue"}
        </button>
      </form>
    </div>
  );
}
