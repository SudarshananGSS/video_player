"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteMedia(mediaId: string, storagePath: string, thumbnailPath: string | null) {
  const supabase = await createClient();

  const paths = thumbnailPath ? [storagePath, thumbnailPath] : [storagePath];
  await supabase.storage.from("media").remove(paths);
  await supabase.from("media").delete().eq("id", mediaId);

  revalidatePath("/dashboard");
}
