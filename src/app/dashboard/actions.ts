"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";

export async function deleteMedia(mediaId: string, storagePath: string) {
  const supabase = await createClient();

  await supabase.storage.from("media").remove([storagePath]);
  await supabase.from("media").delete().eq("id", mediaId);

  revalidatePath("/dashboard");
}

export async function createShareLink(mediaId: string) {
  const supabase = await createClient();
  const token = nanoid(10);

  const { data, error } = await supabase
    .rpc("create_share_link", {
      p_media_id: mediaId,
      p_token: token,
    })
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { token: (data as { token: string }).token };
}
