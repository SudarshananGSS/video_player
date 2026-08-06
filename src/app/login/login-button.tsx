"use client";

import { useFormStatus } from "react-dom";

export function LoginButton({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      formAction={action}
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-70"
    >
      {pending && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
          <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2" opacity="0.3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      {pending ? "Signing in..." : "Log in"}
    </button>
  );
}
