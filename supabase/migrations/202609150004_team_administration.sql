create or replace function public.get_team_members(target_team uuid)
returns table (user_id uuid, full_name text, email text, role public.team_role, joined_at timestamptz)
language sql stable security definer set search_path = public as $$
  select tm.user_id, p.full_name, p.email, tm.role, tm.joined_at from public.team_members tm join public.profiles p on p.id = tm.user_id where tm.team_id = target_team and public.is_team_admin(target_team) order by tm.role, p.email
$$;
create or replace function public.update_team_member_role(target_team uuid, target_user uuid, new_role public.team_role) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_team_admin(target_team) then raise exception 'No autorizado'; end if;
  if target_user = auth.uid() and new_role <> 'admin' then raise exception 'No puedes quitarte tu propio rol de administrador'; end if;
  if new_role <> 'admin' and exists (select 1 from public.team_members where team_id = target_team and user_id = target_user and role = 'admin') and (select count(*) from public.team_members where team_id = target_team and role = 'admin') = 1 then raise exception 'El equipo debe conservar un administrador'; end if;
  update public.team_members set role = new_role where team_id = target_team and user_id = target_user;
  if not found then raise exception 'Integrante no encontrado'; end if;
end; $$;
create or replace function public.rename_team(target_team uuid, new_name text) returns void language plpgsql security definer set search_path = public as $$
begin if not public.is_team_admin(target_team) then raise exception 'No autorizado'; end if; if char_length(btrim(new_name)) not between 2 and 100 then raise exception 'El nombre debe tener entre 2 y 100 caracteres'; end if; update public.teams set name = btrim(new_name) where id = target_team; end; $$;
revoke all on function public.get_team_members(uuid), public.update_team_member_role(uuid, uuid, public.team_role), public.rename_team(uuid, text) from public;
grant execute on function public.get_team_members(uuid), public.update_team_member_role(uuid, uuid, public.team_role), public.rename_team(uuid, text) to authenticated;
