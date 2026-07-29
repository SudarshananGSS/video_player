-- Stable, non-expiring welcome-video links keyed by an advisor's AR number.
-- Zoho computes the URL itself via a formula field on the AR number it
-- already has, so no data ever needs to be pushed to/from Zoho.

create table public.advisor_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ar_number text not null unique check (ar_number ~ '^[0-9]{4,10}$'),
  welcome_video_media_id uuid references public.media (id) on delete set null,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index advisor_profiles_ar_number_idx on public.advisor_profiles (ar_number);

alter table public.advisor_profiles enable row level security;

create policy "Advisors can view their own profile"
  on public.advisor_profiles for select
  using (auth.uid() = user_id);

create policy "Advisors can insert their own profile"
  on public.advisor_profiles for insert
  with check (auth.uid() = user_id);

create policy "Advisors can update their own profile"
  on public.advisor_profiles for update
  using (auth.uid() = user_id);

-- Owner-side helper: designate one of the advisor's own ready videos as
-- their welcome video. Validates ownership server-side so an advisor can't
-- point their profile at someone else's media by id.
create or replace function public.set_welcome_video(p_media_id uuid)
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
  set welcome_video_media_id = p_media_id, updated_at = now()
  where user_id = auth.uid()
  returning * into v_profile;

  if not found then
    raise exception 'profile_not_found';
  end if;

  return v_profile;
end;
$$;

grant execute on function public.set_welcome_video(uuid) to authenticated;

-- Public lookup: resolves an AR number to its current welcome video.
-- security definer so anonymous visitors (from an emailed link) can resolve
-- it without direct table access. No token, no expiry, no password —
-- this is a stable, always-on link by design.
create or replace function public.resolve_welcome_video(p_ar_number text)
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

  if not found or v_profile.welcome_video_media_id is null then
    raise exception 'not_found';
  end if;

  select * into v_media
  from public.media
  where id = v_profile.welcome_video_media_id and status = 'ready';

  if not found then
    raise exception 'not_found';
  end if;

  update public.advisor_profiles set view_count = view_count + 1 where user_id = v_profile.user_id;

  return query select v_media.id, v_media.type, v_media.title, v_media.storage_path, v_media.thumbnail_path;
end;
$$;

grant execute on function public.resolve_welcome_video(text) to anon, authenticated;
