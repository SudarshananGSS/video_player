-- Lets a share link point at either the original file or its thumbnail,
-- so a video's poster image can be shared as its own public link.

alter table public.share_links
  add column target text not null default 'original' check (target in ('original', 'thumbnail'));

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
set search_path = public, extensions
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

  if v_link.target = 'thumbnail' and v_media.thumbnail_path is null then
    raise exception 'not_found';
  end if;

  update public.share_links set view_count = view_count + 1 where id = v_link.id;

  if v_link.target = 'thumbnail' then
    return query select v_media.id, 'image'::text, v_media.title, v_media.thumbnail_path, null::text;
  else
    return query select v_media.id, v_media.type, v_media.title, v_media.storage_path, v_media.thumbnail_path;
  end if;
end;
$$;

create or replace function public.create_share_link(
  p_media_id uuid,
  p_token text,
  p_expires_at timestamptz default null,
  p_password text default null,
  p_max_views integer default null,
  p_target text default 'original'
)
returns public.share_links
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_link public.share_links%rowtype;
begin
  if not exists (select 1 from public.media where id = p_media_id and owner_id = auth.uid()) then
    raise exception 'not_authorized';
  end if;

  if p_target not in ('original', 'thumbnail') then
    raise exception 'invalid_target';
  end if;

  insert into public.share_links (media_id, created_by, token, expires_at, password_hash, max_views, target)
  values (
    p_media_id,
    auth.uid(),
    p_token,
    p_expires_at,
    case when p_password is not null and p_password <> '' then crypt(p_password, gen_salt('bf')) else null end,
    p_max_views,
    p_target
  )
  returning * into v_link;

  return v_link;
end;
$$;
