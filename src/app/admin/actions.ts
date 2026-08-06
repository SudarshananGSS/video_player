"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
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

const ALLOWED_THUMBNAIL_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

// Fixed, single path — every upload normalizes to PNG here, so there is
// always exactly one global thumbnail file, never one orphaned per format
// (e.g. a stale .jpg left behind after replacing with a .png).
const GLOBAL_CAMPAIGN_THUMBNAIL_PATH = "_global/campaign-thumbnail.png";

export async function setCampaignThumbnail(formData: FormData) {
  const requester = await requireAdmin();
  if (!requester) {
    return { error: "Not authorized." };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { error: "Choose an image file." };
  }

  if (!ALLOWED_THUMBNAIL_TYPES.has(file.type)) {
    return { error: "Only PNG, JPEG, or WebP images are supported." };
  }

  const admin = createAdminClient();
  const pngBuffer = await sharp(Buffer.from(await file.arrayBuffer())).png().toBuffer();

  const { error: uploadError } = await admin.storage
    .from("media")
    .upload(GLOBAL_CAMPAIGN_THUMBNAIL_PATH, new Uint8Array(pngBuffer), {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error: updateError } = await admin
    .from("campaign_settings")
    .update({ thumbnail_path: GLOBAL_CAMPAIGN_THUMBNAIL_PATH, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function removeCampaignThumbnail() {
  const requester = await requireAdmin();
  if (!requester) {
    return { error: "Not authorized." };
  }

  const admin = createAdminClient();

  const { error: updateError } = await admin
    .from("campaign_settings")
    .update({ thumbnail_path: null, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (updateError) {
    return { error: updateError.message };
  }

  await admin.storage.from("media").remove([GLOBAL_CAMPAIGN_THUMBNAIL_PATH]);

  revalidatePath("/admin");
  return { ok: true };
}
