"use client";

export function CampaignLinks({ arNumber }: { arNumber: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const campaignUrl = `${origin}/campaign/${arNumber}`;
  const thumbnailUrl = `${origin}/campaign/${arNumber}/thumbnail`;

  return (
    <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-[11px] font-medium text-neutral-500">Click-through link</p>
      <input
        readOnly
        value={campaignUrl}
        onFocus={(e) => e.target.select()}
        className="mt-1 w-full rounded border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-600"
      />

      <p className="mt-2 text-[11px] font-medium text-neutral-500">
        Thumbnail image URL (use as &lt;img src&gt; in emails)
      </p>
      <input
        readOnly
        value={thumbnailUrl}
        onFocus={(e) => e.target.select()}
        className="mt-1 w-full rounded border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-600"
      />
    </div>
  );
}
