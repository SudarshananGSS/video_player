-- ALTER FUNCTION ... RENAME only renames the function object, not the SQL
-- inside its body, which still referenced the pre-rename welcome_video_media_id
-- column. Redefine both bodies against the renamed campaign_video_media_id.

create or replace function public.set_campaign_video(p_media_id uuid)
returns public.advisor_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.advisor_profiles%rowtype;
begin
  if not exists (
    select 1 from public.media
    where id = p_media_id and owner_id = auth.uid() and type = 'video'
  ) then
    raise exception 'not_authorized';
  end if;

  update public.advisor_profiles
  set campaign_video_media_id = p_media_id, updated_at = now()
  where user_id = auth.uid()
  returning * into v_profile;

  if not found then
    raise exception 'profile_not_found';
  end if;

  return v_profile;
end;
$$;

create or replace function public.resolve_campaign_video(p_ar_number text)
returns table (
  media_id uuid,
  type text,
  title text,
  storage_path text,
  thumbnail_path text
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

  return query select v_media.id, v_media.type, v_media.title, v_media.storage_path, v_media.thumbnail_path;
end;
$$;
