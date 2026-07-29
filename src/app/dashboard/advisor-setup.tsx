"use client";

export function AdvisorSetup({ arNumber }: { arNumber: string | null }) {
  if (arNumber) {
    const campaignUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/campaign/${arNumber}`;
    return (
      <div className="mb-8 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Your campaign video link</p>
        <p className="mt-1 text-sm text-neutral-600">
          AR {arNumber} · This link never changes, even if you replace your campaign video, so it can be reused
          across welcome emails and other campaigns. Give it to your Zoho admin once to set up email templates.
        </p>
        <input
          readOnly
          value={campaignUrl}
          onFocus={(e) => e.target.select()}
          className="mt-2 w-full rounded border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-600"
        />
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-900">No AR number on file</p>
      <p className="mt-1 text-xs text-amber-700">
        Your campaign video link is generated from your AR number. Ask your admin to set it on your account.
      </p>
    </div>
  );
}
