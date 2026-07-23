import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { UploadForm } from "./upload-form";
import { MediaList } from "./media-list";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: media } = await supabase
    .from("media")
    .select("id, type, title, storage_path, thumbnail_path, status, created_at")
    .order("created_at", { ascending: false });

  const withPreviewUrls = await Promise.all(
    (media ?? []).map(async (item) => {
      const previewPath = item.thumbnail_path ?? (item.type === "image" ? item.storage_path : null);
      if (!previewPath) return { ...item, previewUrl: null as string | null };
      const { data } = await supabase.storage.from("media").createSignedUrl(previewPath, 60 * 60);
      return { ...item, previewUrl: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your library</h1>
          <p className="text-sm text-neutral-500">{user?.email}</p>
        </div>
        <form action={logout}>
          <button className="text-sm text-neutral-500 underline hover:text-neutral-700">Log out</button>
        </form>
      </div>

      <UploadForm ownerId={user!.id} />

      <MediaList items={withPreviewUrls} />

      <p className="mt-8 text-xs text-neutral-400">
        Public share links use{" "}
        <Link href="/watch" className="underline">
          /watch/[token]
        </Link>
      </p>
    </div>
  );
}
