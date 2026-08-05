-- resolve_share_link collapses both thumbnail-target shares and plain image
-- shares to type='image', so /img/[token] can't tell whether it's serving a
-- video's thumbnail (needs a baked-in play button) or an actual photo
-- (doesn't). Return the share link's target so the caller can distinguish.
-- Return type is changing, so this needs a drop + recreate rather than
-- create or replace.

drop function if exists public.resolve_share_link(text, text);

create function public.resolve_share_link(p_token text, p_password text default null)
returns table (
  media_id uuid,
  type text,
  title text,
  storage_path text,
  thumbnail_path text,
  target text
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
    return query select v_media.id, 'image'::text, v_media.title, v_media.thumbnail_path, null::text, v_link.target;
  else
    return query select v_media.id, v_media.type, v_media.title, v_media.storage_path, v_media.thumbnail_path, v_link.target;
  end if;
end;
$$;

grant execute on function public.resolve_share_link(text, text) to anon, authenticated;
