import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logout } from "@/app/login/actions";
import { InviteAdvisorForm } from "./invite-advisor-form";
import { AdvisorMediaGrid } from "./advisor-media-grid";
import { CampaignThumbnailForm } from "./campaign-thumbnail-form";
import { CampaignLinks } from "./campaign-links";

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

  const admin = createAdminClient();

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

    mediaItems = await Promise.all(
      (media ?? []).map(async (item) => {
        const previewPath = item.thumbnail_path ?? (item.type === "image" ? item.storage_path : null);
        if (!previewPath) return { ...item, previewUrl: null };
        const { data } = await admin.storage.from("media").createSignedUrl(previewPath, 60 * 60);
        return { ...item, previewUrl: data?.signedUrl ?? null };
      }),
    );
  }

  const { data: campaignSettings } = await admin
    .from("campaign_settings")
    .select("thumbnail_path")
    .eq("id", true)
    .single();

  let campaignThumbnailUrl: string | null = null;
  if (campaignSettings?.thumbnail_path) {
    const { data } = await admin.storage.from("media").createSignedUrl(campaignSettings.thumbnail_path, 60 * 60);
    campaignThumbnailUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="bg-neutral-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded bg-white/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide">
              Admin
            </span>
            <span className="text-sm text-neutral-300">{user?.email}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-neutral-300 underline hover:text-white">
              Your advisor dashboard
            </Link>
            <form action={logout}>
              <button className="text-neutral-300 underline hover:text-white">Log out</button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <InviteAdvisorForm />

        <CampaignThumbnailForm currentThumbnailUrl={campaignThumbnailUrl} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Advisors {advisors.length > 0 && <span className="text-neutral-400">({advisors.length})</span>}
            </h2>
            {advisors.length === 0 ? (
              <p className="px-2 text-sm text-neutral-400">No advisors yet.</p>
            ) : (
              <ul className="space-y-1">
                {advisors.map((advisor) => (
                  <li key={advisor.user_id}>
                    <Link
                      href={`/admin?advisor=${advisor.user_id}`}
                      className={`block truncate rounded-md px-2 py-1.5 text-sm ${
                        advisor.user_id === selectedAdvisorId
                          ? "bg-neutral-900 text-white"
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

          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            {selectedAdvisor ? (
              <>
                <h2 className="mb-3 text-sm font-semibold text-neutral-700">
                  {selectedAdvisor.email}
                  {selectedAdvisor.arNumber && (
                    <span className="ml-2 font-normal text-neutral-400">AR {selectedAdvisor.arNumber}</span>
                  )}
                </h2>
                {selectedAdvisor.arNumber && <CampaignLinks arNumber={selectedAdvisor.arNumber} />}
                <AdvisorMediaGrid items={mediaItems} campaignVideoMediaId={selectedAdvisor.campaignVideoMediaId} />
              </>
            ) : (
              <p className="py-10 text-center text-sm text-neutral-400">Select an advisor to view their media.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
