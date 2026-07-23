"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ResolveResult =
  | { ok: true; type: "video" | "image"; title: string | null; url: string; posterUrl: string | null }
  | { ok: false; error: "not_found" | "expired" | "max_views_reached" | "password_required" | "unknown" };

export async function resolveShareLink(token: string, password?: string): Promise<ResolveResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("resolve_share_link", { p_token: token, p_password: password ?? null })
    .single();

  if (error) {
    const known = ["not_found", "expired", "max_views_reached", "password_required"];
    const message = error.message as string;
    return { ok: false, error: (known.find((k) => message.includes(k)) as never) ?? "unknown" };
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
