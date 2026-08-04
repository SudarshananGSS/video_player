import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Direct-image counterpart to /campaign/[arNumber] (an HTML page), so the
// advisor's stable campaign thumbnail can be embedded as <img src> in an
// email template.
export async function GET(_request: Request, { params }: { params: Promise<{ arNumber: string }> }) {
  const { arNumber } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("resolve_campaign_video", { p_ar_number: arNumber }).single();

  if (error) {
    return new NextResponse(null, { status: 404 });
  }

  const media = data as { thumbnail_path: string | null };

  if (!media.thumbnail_path) {
    return new NextResponse(null, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: signed, error: signError } = await admin.storage
    .from("media")
    .createSignedUrl(media.thumbnail_path, 60);

  if (signError || !signed) {
    return new NextResponse(null, { status: 404 });
  }

  const upstream = await fetch(signed.signedUrl);

  if (!upstream.ok || !upstream.body) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
