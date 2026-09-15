-- Repair profiles for accounts that already existed before the profile trigger was installed.
insert into public.profiles (id, email, full_name)
select
  u.id,
  lower(u.email),
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1))
from auth.users u
where u.email is not null
on conflict (id) do update
set email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

-- A missing profile must not hide an existing team member from the administrator.
create or replace function public.get_team_members(target_team uuid)
returns table (user_id uuid, full_name text, email text, role public.team_role, joined_at timestamptz)
language sql stable security definer set search_path = public as $$
  select
    tm.user_id,
    coalesce(p.full_name, 'Sin nombre'),
    coalesce(p.email, ''),
    tm.role,
    tm.joined_at
  from public.team_members tm
  left join public.profiles p on p.id = tm.user_id
  where tm.team_id = target_team
    and public.is_team_admin(target_team)
  order by tm.role, coalesce(p.email, '')
$$;

revoke all on function public.get_team_members(uuid) from public;
grant execute on function public.get_team_members(uuid) to authenticated;
