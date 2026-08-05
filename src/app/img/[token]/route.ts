import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureRasterImage } from "@/lib/rasterize-image";
import { addPlayButton } from "@/lib/add-play-button";

// Serves the actual image bytes for a share link, unlike /watch/[token]
// (an HTML page). Needed for embedding a thumbnail as <img src> in email
// templates, which can't execute JS or render a webpage.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("resolve_share_link", { p_token: token, p_password: null }).single();

  if (error) {
    const status = error.message.includes("password_required") ? 403 : 404;
    return new NextResponse(null, { status });
  }

  const media = data as { type: "video" | "image"; storage_path: string; target: string };

  if (media.type !== "image") {
    return new NextResponse(null, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: signed, error: signError } = await admin.storage
    .from("media")
    .createSignedUrl(media.storage_path, 60);

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

  // Only a video's thumbnail gets the play button — a plain shared photo
  // isn't playable and shouldn't look like it is.
  const finalBuffer = media.target === "thumbnail" ? await addPlayButton(buffer) : buffer;

  return new NextResponse(new Uint8Array(finalBuffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
