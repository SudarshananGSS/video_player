-- AR numbers are now set by an admin when inviting an advisor, not by the
-- advisor themselves. Drop the self-serve insert/update policies so
-- advisor_profiles rows can only be written by server code using the
-- service role (which bypasses RLS) or by the set_campaign_video RPC
-- (security definer, unaffected by this change).

drop policy if exists "Advisors can insert their own profile" on public.advisor_profiles;
drop policy if exists "Advisors can update their own profile" on public.advisor_profiles;
