import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const media = data as { type: "video" | "image"; storage_path: string };

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
