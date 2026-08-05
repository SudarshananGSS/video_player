-- Lets an admin set a static thumbnail for an advisor's campaign video,
-- overriding the auto-derived one (video frame/custom upload + baked-in
-- play button). No RLS write policy is added for this column — like
-- ar_number, it's only ever written by server code using the service role,
-- so an advisor can never set it themselves.

alter table public.advisor_profiles add column campaign_thumbnail_path text;

drop function if exists public.resolve_campaign_video(text);

create function public.resolve_campaign_video(p_ar_number text)
returns table (
  media_id uuid,
  type text,
  title text,
  storage_path text,
  thumbnail_path text,
  campaign_thumbnail_path text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.advisor_profiles%rowtype;
  v_media public.media%rowtype;
begin
  select * into v_profile from public.advisor_profiles where ar_number = p_ar_number;

  if not found or v_profile.campaign_video_media_id is null then
    raise exception 'not_found';
  end if;

  select * into v_media
  from public.media
  where id = v_profile.campaign_video_media_id and status = 'ready';

  if not found then
    raise exception 'not_found';
  end if;

  update public.advisor_profiles set view_count = view_count + 1 where user_id = v_profile.user_id;

  return query select
    v_media.id, v_media.type, v_media.title, v_media.storage_path, v_media.thumbnail_path,
    v_profile.campaign_thumbnail_path;
end;
$$;

grant execute on function public.resolve_campaign_video(text) to anon, authenticated;
