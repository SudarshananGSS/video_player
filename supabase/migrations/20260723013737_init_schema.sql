-- Media library schema: owner-uploaded media + public share links.

create extension if not exists pgcrypto;

create table public.media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('video', 'image')),
  title text,
  storage_path text not null,
  thumbnail_path text,
  mime_type text,
  size_bytes bigint,
  duration_seconds integer,
  status text not null default 'uploading' check (status in ('uploading', 'processing', 'ready', 'failed')),
  created_at timestamptz not null default now()
);

create index media_owner_id_idx on public.media (owner_id);

alter table public.media enable row level security;

create policy "Owners can view their own media"
  on public.media for select
  using (auth.uid() = owner_id);

create policy "Owners can insert their own media"
  on public.media for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update their own media"
  on public.media for update
  using (auth.uid() = owner_id);

create policy "Owners can delete their own media"
  on public.media for delete
  using (auth.uid() = owner_id);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz,
  password_hash text,
  max_views integer,
  view_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index share_links_media_id_idx on public.share_links (media_id);
create index share_links_token_idx on public.share_links (token);

alter table public.share_links enable row level security;

create policy "Owners can view their own share links"
  on public.share_links for select
  using (auth.uid() = created_by);

create policy "Owners can create share links for their own media"
  on public.share_links for insert
  with check (
    auth.uid() = created_by
    and exists (select 1 from public.media m where m.id = media_id and m.owner_id = auth.uid())
  );

create policy "Owners can update their own share links"
  on public.share_links for update
  using (auth.uid() = created_by);

create policy "Owners can delete their own share links"
  on public.share_links for delete
  using (auth.uid() = created_by);

-- Public lookup: validates a share token (expiry, view cap, password) and
-- returns just enough to fetch the file. security definer so anonymous
-- visitors can resolve a token without direct table/RLS access.
create or replace function public.resolve_share_link(p_token text, p_password text default null)
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
  v_link public.share_links%rowtype;
  v_media public.media%rowtype;
begin
  select * into v_link from public.share_links where token = p_token;

  if not found then
    raise exception 'not_found';
  end if;

  if v_link.expires_at is not null and v_link.expires_at < now() then
    raise exception 'expired';
  end if;

  if v_link.max_views is not null and v_link.view_count >= v_link.max_views then
    raise exception 'max_views_reached';
  end if;

  if v_link.password_hash is not null
     and (p_password is null or crypt(p_password, v_link.password_hash) <> v_link.password_hash) then
    raise exception 'password_required';
  end if;

  select * into v_media from public.media where id = v_link.media_id and status = 'ready';

  if not found then
    raise exception 'not_found';
  end if;

  update public.share_links set view_count = view_count + 1 where id = v_link.id;

  return query select v_media.id, v_media.type, v_media.title, v_media.storage_path, v_media.thumbnail_path;
end;
$$;

grant execute on function public.resolve_share_link(text, text) to anon, authenticated;

-- Owner-side helper so the app never has to hash passwords client-side.
create or replace function public.create_share_link(
  p_media_id uuid,
  p_token text,
  p_expires_at timestamptz default null,
  p_password text default null,
  p_max_views integer default null
)
returns public.share_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.share_links%rowtype;
begin
  if not exists (select 1 from public.media where id = p_media_id and owner_id = auth.uid()) then
    raise exception 'not_authorized';
  end if;

  insert into public.share_links (media_id, created_by, token, expires_at, password_hash, max_views)
  values (
    p_media_id,
    auth.uid(),
    p_token,
    p_expires_at,
    case when p_password is not null and p_password <> '' then crypt(p_password, gen_salt('bf')) else null end,
    p_max_views
  )
  returning * into v_link;

  return v_link;
end;
$$;

grant execute on function public.create_share_link(uuid, text, timestamptz, text, integer) to authenticated;

-- Storage bucket for originals + thumbnails. Kept private; playback goes
-- through signed URLs issued after resolve_share_link succeeds.
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

create policy "Owners can upload their own media objects"
  on storage.objects for insert
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owners can view their own media objects"
  on storage.objects for select
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owners can update their own media objects"
  on storage.objects for update
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owners can delete their own media objects"
  on storage.objects for delete
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
