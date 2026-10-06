-- Access control: invited users join automatically, only the first team can be
-- self-created, and operators can no longer approve/reject/reopen quotations.

-- 1. Invited Gmail accounts join their teams at sign-in, no link needed.
--    "do nothing" on conflict: a stale pending invite must never downgrade an existing member.
create or replace function public.accept_pending_invitations() returns integer
language plpgsql security definer set search_path = public as $$
declare current_email text; accepted integer := 0;
begin
  if auth.uid() is null then return 0; end if;
  select lower(email) into current_email from public.profiles where id = auth.uid();
  with pending as (
    update public.team_invitations set accepted_at = now()
    where email = current_email and accepted_at is null and revoked_at is null and expires_at > now()
    returning team_id, role
  )
  insert into public.team_members (team_id, user_id, role)
  select team_id, auth.uid(), role from pending
  on conflict (team_id, user_id) do nothing;
  get diagnostics accepted = row_count;
  return accepted;
end; $$;

-- 2. Only the very first team can be created from the UI (bootstrap of the first admin).
create or replace function public.can_create_team() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and not exists (select 1 from public.teams)
$$;

create or replace function public.create_team(team_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare created_team uuid;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  if char_length(btrim(team_name)) not between 2 and 100 then
    raise exception 'El nombre del equipo debe tener entre 2 y 100 caracteres';
  end if;

  select id into created_team from public.teams where lower(btrim(name)) = lower(btrim(team_name));
  if created_team is not null then
    if public.is_team_member(created_team) then return created_team; end if;
    raise exception 'Ya existe un equipo con ese nombre';
  end if;

  if not public.can_create_team() then
    raise exception 'Solo un administrador puede dar acceso. Pide que te inviten con tu correo.';
  end if;

  insert into public.teams (name, created_by) values (btrim(team_name), auth.uid()) returning id into created_team;
  insert into public.team_members (team_id, user_id, role) values (created_team, auth.uid(), 'admin');
  return created_team;
end; $$;

-- 3. Operators can edit quotations but cannot approve, reject, expire or reopen them.
create or replace function public.guard_quotation_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status
     and (new.status in ('approved','rejected','expired') or old.status in ('approved','rejected','expired'))
     and exists (select 1 from public.team_members where team_id = new.team_id and user_id = auth.uid() and role = 'operator') then
    raise exception 'Solo un administrador o coordinador puede aprobar, rechazar o reabrir una cotización';
  end if;
  return new;
end; $$;

drop trigger if exists quotations_guard_status on public.quotations;
create trigger quotations_guard_status before update of status on public.quotations
  for each row execute function public.guard_quotation_status();

revoke all on function public.accept_pending_invitations(), public.can_create_team() from public;
grant execute on function public.accept_pending_invitations(), public.can_create_team() to authenticated;
