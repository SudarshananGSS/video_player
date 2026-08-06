-- Replaces the per-advisor campaign thumbnail override with a single
-- global one that applies to every advisor's campaign link. Only ever
-- written by server code using the service role (RLS enabled, no
-- policies), same as the per-advisor version it replaces.

create table public.campaign_settings (
  id boolean primary key default true,
  thumbnail_path text,
  updated_at timestamptz not null default now(),
  constraint campaign_settings_singleton check (id)
);

alter table public.campaign_settings enable row level security;

insert into public.campaign_settings (id) values (true);

alter table public.advisor_profiles drop column campaign_thumbnail_path;

drop function if exists public.resolve_campaign_video(text);

create function public.resolve_campaign_video(p_ar_number text)
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

grant execute on function public.resolve_campaign_video(text) to anon, authenticated;
