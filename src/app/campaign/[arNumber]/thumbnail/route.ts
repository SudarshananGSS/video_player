import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureRasterImage } from "@/lib/rasterize-image";
import { addPlayButton } from "@/lib/add-play-button";

// Direct-image counterpart to /campaign/[arNumber] (an HTML page), so the
// advisor's stable campaign thumbnail can be embedded as <img src> in an
// email template.
export async function GET(_request: Request, { params }: { params: Promise<{ arNumber: string }> }) {
  const { arNumber } = await params;
  const supabase = await createClient();

  // Still requires a live campaign video for this AR number — a thumbnail
  // with nothing for its click-through link to point at isn't meaningful,
  // static override or not.
  const { data, error } = await supabase.rpc("resolve_campaign_video", { p_ar_number: arNumber }).single();

  if (error) {
    return new NextResponse(null, { status: 404 });
  }

  const media = data as { thumbnail_path: string | null };
  const admin = createAdminClient();

  const { data: campaignSettings } = await admin
    .from("campaign_settings")
    .select("thumbnail_path")
    .eq("id", true)
    .single();

  // An admin-set static thumbnail (applies to every advisor) is served
  // as-is — no play button baked in, since it's already exactly what the
  // admin chose. Only the auto-derived fallback (a video frame or the
  // advisor's own upload) gets the play button composited in at request
  // time.
  const isStaticOverride = Boolean(campaignSettings?.thumbnail_path);
  const sourcePath = campaignSettings?.thumbnail_path ?? media.thumbnail_path;

  if (!sourcePath) {
    return new NextResponse(null, { status: 404 });
  }

  const { data: signed, error: signError } = await admin.storage.from("media").createSignedUrl(sourcePath, 60);

  if (signError || !signed) {
    return new NextResponse(null, { status: 404 });
  }

  const upstream = await fetch(signed.signedUrl);

  if (!upstream.ok) {
    return new NextResponse(null, { status: 404 });
  }

  const { buffer, contentType } = await ensureRasterImage(
    await upstream.arrayBuffer(),
    upstream.headers.get("content-type"),
  );

  const finalBuffer = isStaticOverride ? buffer : await addPlayButton(buffer);

  return new NextResponse(new Uint8Array(finalBuffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
