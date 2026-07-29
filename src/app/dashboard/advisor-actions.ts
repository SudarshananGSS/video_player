"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const AR_NUMBER_PATTERN = /^[0-9]{4,10}$/;

export async function setArNumber(arNumber: string) {
  const trimmed = arNumber.trim();

  if (!AR_NUMBER_PATTERN.test(trimmed)) {
    return { error: "AR number must be 4-10 digits." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  const { error } = await supabase
    .from("advisor_profiles")
    .upsert({ user_id: user.id, ar_number: trimmed }, { onConflict: "user_id" });

  if (error) {
    return { error: error.code === "23505" ? "That AR number is already in use." : error.message };
  }

  revalidatePath("/dashboard");
  return { arNumber: trimmed };
}

export async function setWelcomeVideo(mediaId: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("set_welcome_video", { p_media_id: mediaId });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
