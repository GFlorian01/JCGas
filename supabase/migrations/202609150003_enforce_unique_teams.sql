-- Keep the earliest duplicate team for each owner/name pair. These duplicates
-- were created during initial setup and have no operational data.
with ranked as (
  select id, row_number() over (
    partition by created_by, lower(btrim(name))
    order by created_at, id
  ) as position
  from public.teams
), duplicates as (
  select id from ranked where position > 1
)
delete from public.team_members where team_id in (select id from duplicates);

with ranked as (
  select id, row_number() over (
    partition by created_by, lower(btrim(name))
    order by created_at, id
  ) as position
  from public.teams
)
delete from public.teams where id in (select id from ranked where position > 1);

create unique index teams_unique_normalized_name
  on public.teams ((lower(btrim(name))));

create or replace function public.create_team(team_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare created_team uuid;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  if char_length(btrim(team_name)) not between 2 and 100 then
    raise exception 'El nombre del equipo debe tener entre 2 y 100 caracteres';
  end if;

  select id into created_team
  from public.teams
  where lower(btrim(name)) = lower(btrim(team_name));

  if created_team is not null then
    if public.is_team_member(created_team) then return created_team; end if;
    raise exception 'Ya existe un equipo con ese nombre';
  end if;

  insert into public.teams (name, created_by)
  values (btrim(team_name), auth.uid())
  returning id into created_team;
  insert into public.team_members (team_id, user_id, role)
  values (created_team, auth.uid(), 'admin');
  return created_team;
end;
$$;

create or replace function public.get_my_teams()
returns table (id uuid, name text, role public.team_role)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, tm.role
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.user_id = auth.uid()
  order by t.name
$$;

revoke all on function public.get_my_teams() from public;
grant execute on function public.get_my_teams() to authenticated;
