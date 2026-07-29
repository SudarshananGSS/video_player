import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { InviteAdvisorForm } from "./invite-advisor-form";
import { AdvisorMediaGrid } from "./advisor-media-grid";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ advisor?: string }>;
}) {
  const { advisor: selectedAdvisorId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ownProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user!.id)
    .single();

  if (!ownProfile?.is_admin) {
    redirect("/dashboard");
  }

  const { data: advisorProfiles } = await supabase
    .from("profiles")
    .select("user_id, email")
    .eq("is_admin", false)
    .order("email");

  const { data: advisorDetails } = await supabase
    .from("advisor_profiles")
    .select("user_id, ar_number, campaign_video_media_id");

  const detailsByUserId = new Map((advisorDetails ?? []).map((d) => [d.user_id, d]));

  const advisors = (advisorProfiles ?? []).map((p) => ({
    ...p,
    arNumber: detailsByUserId.get(p.user_id)?.ar_number ?? null,
    campaignVideoMediaId: detailsByUserId.get(p.user_id)?.campaign_video_media_id ?? null,
  }));

  const selectedAdvisor = advisors.find((a) => a.user_id === selectedAdvisorId) ?? null;

  let mediaItems: { id: string; type: string; title: string | null; status: string; previewUrl: string | null }[] = [];

  if (selectedAdvisor) {
    const { data: media } = await supabase
      .from("media")
      .select("id, type, title, storage_path, thumbnail_path, status")
      .eq("owner_id", selectedAdvisor.user_id)
      .order("created_at", { ascending: false });

    const admin = createAdminClient();
    mediaItems = await Promise.all(
      (media ?? []).map(async (item) => {
        const previewPath = item.thumbnail_path ?? (item.type === "image" ? item.storage_path : null);
        if (!previewPath) return { ...item, previewUrl: null };
        const { data } = await admin.storage.from("media").createSignedUrl(previewPath, 60 * 60);
        return { ...item, previewUrl: data?.signedUrl ?? null };
      }),
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between border-b border-neutral-200 pb-6">
        <div>
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="text-sm text-neutral-500">{user?.email}</p>
        </div>
        <Link href="/dashboard" className="text-sm text-neutral-500 underline hover:text-neutral-700">
          Your dashboard
        </Link>
      </div>

      <InviteAdvisorForm />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">
            Advisors {advisors.length > 0 && <span className="text-neutral-400">({advisors.length})</span>}
          </h2>
          {advisors.length === 0 ? (
            <p className="text-sm text-neutral-400">No advisors yet.</p>
          ) : (
            <ul className="space-y-1">
              {advisors.map((advisor) => (
                <li key={advisor.user_id}>
                  <Link
                    href={`/admin?advisor=${advisor.user_id}`}
                    className={`block truncate rounded-md px-3 py-1.5 text-sm ${
                      advisor.user_id === selectedAdvisorId
                        ? "bg-black text-white"
                        : "text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    {advisor.email}
                    {!advisor.arNumber && <span className="ml-1 text-xs opacity-60">(no AR number)</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          {selectedAdvisor ? (
            <>
              <h2 className="mb-3 text-sm font-semibold text-neutral-700">
                {selectedAdvisor.email}
                {selectedAdvisor.arNumber && (
                  <span className="ml-2 font-normal text-neutral-400">AR {selectedAdvisor.arNumber}</span>
                )}
              </h2>
              <AdvisorMediaGrid items={mediaItems} campaignVideoMediaId={selectedAdvisor.campaignVideoMediaId} />
            </>
          ) : (
            <p className="rounded-lg border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-400">
              Select an advisor to view their media.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
