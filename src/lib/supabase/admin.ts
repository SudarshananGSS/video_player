import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for trusted server-only operations (signed URL
// generation for public playback). Never import this from client components.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
