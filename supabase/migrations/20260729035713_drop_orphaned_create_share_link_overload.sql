-- The migration that added p_target used CREATE OR REPLACE with an extra
-- parameter, which Postgres treats as a distinct overload rather than a
-- replacement (signatures must match exactly to replace). That left the
-- pre-thumbnail-sharing 5-arg create_share_link orphaned alongside the
-- current 6-arg one, causing "could not choose the best candidate function"
-- errors for any caller that omits p_target. Drop the stale overload.

drop function if exists public.create_share_link(uuid, text, timestamptz, text, integer);
