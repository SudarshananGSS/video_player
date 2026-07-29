-- Admin/advisor roles. Admin is an additive permission (not exclusive with
-- being an advisor): every user still has their own advisor dashboard
-- (upload, AR number, campaign video); is_admin just grants extra read
-- access to browse other advisors' media and invite new ones.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- No insert/update policy for `authenticated`: profiles rows are only ever
-- written by server code using the service role (on invite, or backfilled
-- below), so a client can never self-elevate is_admin.

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

-- security definer + fixed search_path so this can be used inside RLS
-- policies without recursively re-checking RLS on every call.
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.user_id = uid), false);
$$;

grant execute on function public.is_admin(uuid) to authenticated;

create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "Admins can view all media"
  on public.media for select
  using (public.is_admin());

create policy "Admins can view all advisor profiles"
  on public.advisor_profiles for select
  using (public.is_admin());

-- Backfill profiles for any users created before this migration.
insert into public.profiles (user_id, email, is_admin)
select id, email, false from auth.users
on conflict (user_id) do nothing;
