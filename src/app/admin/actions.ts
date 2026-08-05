"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const AR_NUMBER_PATTERN = /^[0-9]{4,10}$/;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("user_id", user.id).single();

  return profile?.is_admin ? user : null;
}

export async function inviteAdvisor(email: string, arNumber: string) {
  const trimmedEmail = email.trim();
  const trimmedAr = arNumber.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { error: "Enter a valid email address." };
  }

  if (!AR_NUMBER_PATTERN.test(trimmedAr)) {
    return { error: "AR number must be 4-10 digits." };
  }

  const requester = await requireAdmin();
  if (!requester) {
    return { error: "Not authorized." };
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("advisor_profiles")
    .select("user_id")
    .eq("ar_number", trimmedAr)
    .maybeSingle();

  if (existing) {
    return { error: "That AR number is already in use." };
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(trimmedEmail, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/set-password`,
  });

  if (error) {
    return { error: error.message };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ user_id: data.user.id, email: trimmedEmail, is_admin: false });

  if (profileError) {
    return { error: profileError.message };
  }

  const { error: advisorProfileError } = await admin
    .from("advisor_profiles")
    .insert({ user_id: data.user.id, ar_number: trimmedAr });

  if (advisorProfileError) {
    return { error: advisorProfileError.message };
  }

  revalidatePath("/admin");
  return { ok: true };
}

const THUMBNAIL_CONTENT_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function setCampaignThumbnail(advisorUserId: string, formData: FormData) {
  const requester = await requireAdmin();
  if (!requester) {
    return { error: "Not authorized." };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { error: "Choose an image file." };
  }

  const ext = THUMBNAIL_CONTENT_TYPES[file.type];
  if (!ext) {
    return { error: "Only PNG, JPEG, or WebP images are supported." };
  }

  const admin = createAdminClient();
  const path = `${advisorUserId}/campaign-thumbnail.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("media")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error: updateError } = await admin
    .from("advisor_profiles")
    .update({ campaign_thumbnail_path: path })
    .eq("user_id", advisorUserId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function removeCampaignThumbnail(advisorUserId: string) {
  const requester = await requireAdmin();
  if (!requester) {
    return { error: "Not authorized." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("advisor_profiles")
    .update({ campaign_thumbnail_path: null })
    .eq("user_id", advisorUserId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  return { ok: true };
}
