"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setCampaignVideo(mediaId: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("set_campaign_video", { p_media_id: mediaId });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
