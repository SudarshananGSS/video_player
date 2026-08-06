-- The dashboard now shows every video's share link up front instead of
-- generating one on click, so re-rendering the page must not spam new
-- share_links rows. This RPC returns each media item's existing link
-- (created by this owner, for the given target) or creates one on first
-- request, in a single batched call.

create function public.get_or_create_share_links(p_media_ids uuid[], p_target text default 'original')
returns table (media_id uuid, token text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_media_id uuid;
  v_existing_token text;
  v_new_token text;
begin
  if p_target not in ('original', 'thumbnail') then
    raise exception 'invalid_target';
  end if;

  foreach v_media_id in array p_media_ids loop
    if not exists (select 1 from public.media m where m.id = v_media_id and m.owner_id = auth.uid()) then
      continue;
    end if;

    select sl.token into v_existing_token
    from public.share_links sl
    where sl.media_id = v_media_id and sl.target = p_target and sl.created_by = auth.uid()
    order by sl.created_at asc
    limit 1;

    if v_existing_token is not null then
      media_id := v_media_id;
      token := v_existing_token;
      return next;
    else
      v_new_token := encode(gen_random_bytes(8), 'hex');
      insert into public.share_links (media_id, created_by, token, target)
      values (v_media_id, auth.uid(), v_new_token, p_target);
      media_id := v_media_id;
      token := v_new_token;
      return next;
    end if;

    v_existing_token := null;
  end loop;
end;
$$;

grant execute on function public.get_or_create_share_links(uuid[], text) to authenticated;
