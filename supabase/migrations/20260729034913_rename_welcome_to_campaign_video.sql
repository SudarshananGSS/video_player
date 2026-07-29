-- Generalize "welcome video" into "campaign video" so the same stable,
-- AR-number-keyed link can back any campaign email, not just welcome emails.
-- Renames preserve the underlying objects (and their grants), so existing
-- advisor_profiles rows and data are untouched.

alter table public.advisor_profiles rename column welcome_video_media_id to campaign_video_media_id;

alter function public.set_welcome_video(uuid) rename to set_campaign_video;
alter function public.resolve_welcome_video(text) rename to resolve_campaign_video;
