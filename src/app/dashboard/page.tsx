import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { UploadForm } from "./upload-form";
import { MediaList } from "./media-list";
import { AdvisorSetup } from "./advisor-setup";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: ownProfile }, { data: advisorProfile }, { data: media }] = await Promise.all([
    supabase.from("profiles").select("is_admin").eq("user_id", user!.id).maybeSingle(),
    supabase
      .from("advisor_profiles")
      .select("ar_number, campaign_video_media_id")
      .eq("user_id", user!.id)
      .maybeSingle(),
    supabase
      .from("media")
      .select("id, type, title, storage_path, thumbnail_path, status, created_at")
      .eq("owner_id", user!.id)
      .order("created_at", { ascending: false }),
  ]);

  const previewPaths = (media ?? [])
    .map((item) => item.thumbnail_path ?? (item.type === "image" ? item.storage_path : null))
    .filter((path): path is string => path !== null);

  const { data: signedUrls } = previewPaths.length
    ? await supabase.storage.from("media").createSignedUrls(previewPaths, 60 * 60)
    : { data: [] as { path: string | null; signedUrl: string }[] | null };

  const signedUrlByPath = new Map((signedUrls ?? []).map((s) => [s.path, s.signedUrl]));

  const readyIds = (media ?? []).filter((item) => item.status === "ready").map((item) => item.id);

  const { data: shareLinks } = readyIds.length
    ? await supabase.rpc("get_or_create_share_links", { p_media_ids: readyIds, p_target: "original" })
    : { data: [] as { media_id: string; token: string }[] | null };

  const tokenByMediaId = new Map(
    ((shareLinks ?? []) as { media_id: string; token: string }[]).map((s) => [s.media_id, s.token]),
  );

  const withPreviewUrls = (media ?? []).map((item) => {
    const previewPath = item.thumbnail_path ?? (item.type === "image" ? item.storage_path : null);
    const token = tokenByMediaId.get(item.id);
    return {
      ...item,
      previewUrl: previewPath ? (signedUrlByPath.get(previewPath) ?? null) : null,
      videoUrl: token ? `${process.env.NEXT_PUBLIC_APP_URL}/watch/${token}` : null,
      shareToken: token ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between border-b border-neutral-200 pb-6">
        <div>
          <h1 className="text-2xl font-semibold">Your library</h1>
          <p className="text-sm text-neutral-500">{user?.email}</p>
        </div>
        <div className="flex items-center gap-4">
          {ownProfile?.is_admin && (
            <Link href="/admin" className="text-sm text-neutral-500 underline hover:text-neutral-700">
              Admin
            </Link>
          )}
          <form action={logout}>
            <button className="text-sm text-neutral-500 underline hover:text-neutral-700">Log out</button>
          </form>
        </div>
      </div>

      <AdvisorSetup arNumber={advisorProfile?.ar_number ?? null} />

      <h2 className="mb-3 text-sm font-semibold text-neutral-700">Upload</h2>
      <UploadForm ownerId={user!.id} />

      <h2 className="mb-3 text-sm font-semibold text-neutral-700">
        Media {withPreviewUrls.length > 0 && <span className="text-neutral-400">({withPreviewUrls.length})</span>}
      </h2>
      <MediaList items={withPreviewUrls} campaignVideoMediaId={advisorProfile?.campaign_video_media_id ?? null} />

      <p className="mt-8 text-xs text-neutral-400">
        Sharing a video or image generates a public link at{" "}
        <Link href="/watch" className="underline">
          /watch/[token]
        </Link>{" "}
        that plays without requiring the viewer to log in.
      </p>
    </div>
  );
}
