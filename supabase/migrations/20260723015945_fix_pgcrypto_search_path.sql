-- pgcrypto's crypt()/gen_salt() live in the `extensions` schema on Supabase,
-- not `public`. The security-definer functions below pinned search_path to
-- `public` only, so calls to crypt/gen_salt failed with 42883.

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

  update public.share_links set view_count = view_count + 1 where id = v_link.id;

  return query select v_media.id, v_media.type, v_media.title, v_media.storage_path, v_media.thumbnail_path;
end;
$$;

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
set search_path = public, extensions
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
