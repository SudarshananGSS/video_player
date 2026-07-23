"use client";

import { useEffect, useState } from "react";
import { resolveShareLink } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  not_found: "This link doesn't exist or the file is no longer available.",
  expired: "This link has expired.",
  max_views_reached: "This link has reached its view limit.",
  unknown: "Something went wrong loading this file.",
};

type Media = { type: "video" | "image"; title: string | null; url: string };

export function WatchClient({ token }: { token: string }) {
  const [media, setMedia] = useState<Media | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    resolveShareLink(token).then((result) => {
      setChecking(false);
      if (result.ok) {
        setMedia(result);
      } else if (result.error === "password_required") {
        setNeedsPassword(true);
      } else {
        setError(ERROR_MESSAGES[result.error]);
      }
    });
  }, [token]);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setPasswordError(null);
    const result = await resolveShareLink(token, password);
    setChecking(false);
    if (result.ok) {
      setMedia(result);
      setNeedsPassword(false);
    } else if (result.error === "password_required") {
      setPasswordError("Incorrect password.");
    } else {
      setError(ERROR_MESSAGES[result.error]);
    }
  }

  if (checking && !needsPassword) {
    return <p className="text-sm text-neutral-400">Loading...</p>;
  }

  if (error) {
    return <p className="text-sm text-neutral-400">{error}</p>;
  }

  if (needsPassword) {
    return (
      <form onSubmit={submitPassword} className="w-full max-w-xs space-y-3">
        <label htmlFor="password" className="block text-sm text-neutral-300">
          This content is password protected
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-transparent px-3 py-2 text-sm text-white"
        />
        {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
        <button
          type="submit"
          disabled={checking}
          className="w-full rounded-md bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          View
        </button>
      </form>
    );
  }

  if (!media) return null;

  if (media.type === "video") {
    return (
      <video
        src={media.url}
        controls
        autoPlay
        className="max-h-[85vh] w-full max-w-4xl rounded-lg"
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={media.url} alt={media.title ?? ""} className="max-h-[85vh] w-full max-w-4xl rounded-lg object-contain" />;
}
