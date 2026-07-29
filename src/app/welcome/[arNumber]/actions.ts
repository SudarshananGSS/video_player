"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ResolveResult =
  | { ok: true; type: "video" | "image"; title: string | null; url: string; posterUrl: string | null }
  | { ok: false; error: "not_found" | "unknown" };

export async function resolveWelcomeVideo(arNumber: string): Promise<ResolveResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("resolve_welcome_video", { p_ar_number: arNumber }).single();

  if (error) {
    return { ok: false, error: error.message.includes("not_found") ? "not_found" : "unknown" };
  }

  const media = data as {
    type: "video" | "image";
    title: string | null;
    storage_path: string;
    thumbnail_path: string | null;
  };

  const admin = createAdminClient();
  const { data: signed, error: signError } = await admin.storage
    .from("media")
    .createSignedUrl(media.storage_path, 60 * 60);

  if (signError || !signed) {
    return { ok: false, error: "unknown" };
  }

  let posterUrl: string | null = null;
  if (media.thumbnail_path) {
    const { data: signedPoster } = await admin.storage
      .from("media")
      .createSignedUrl(media.thumbnail_path, 60 * 60);
    posterUrl = signedPoster?.signedUrl ?? null;
  }

  return { ok: true, type: media.type, title: media.title, url: signed.signedUrl, posterUrl };
}
