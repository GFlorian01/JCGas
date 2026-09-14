-- CotizaPro: schema, team isolation, invitations and quotation history.
-- Apply with: supabase db push (never run this manually against an unknown database).
create extension if not exists pgcrypto;

create type public.team_role as enum ('admin', 'coordinator', 'operator', 'reviewer', 'viewer');
create type public.quotation_status as enum ('draft', 'sent', 'approved', 'rejected', 'expired');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique check (email ~* '^[A-Z0-9._%+\-]+@gmail\.com$'),
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.team_role not null default 'operator',
  joined_at timestamptz not null default now(),
  last_active_at timestamptz,
  primary key (team_id, user_id)
);

create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null check (email ~* '^[A-Z0-9._%+\-]+@gmail\.com$'),
  role public.team_role not null default 'operator',
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (team_id, email)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete restrict,
  business_name text not null,
  ruc text,
  contact_name text,
  contact_email text,
  contact_phone text,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, business_name)
);

create table public.service_locations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  name text not null,
  address text,
  district text,
  province text,
  department text,
  country text not null default 'Perú',
  precision_level text not null default 'exact' check (precision_level in ('exact', 'approximate', 'general')),
  reference_notes text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, client_id, name),
  check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180))
);

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete restrict,
  quotation_code text not null,
  client_id uuid not null references public.clients(id) on delete restrict,
  service_location_id uuid not null references public.service_locations(id) on delete restrict,
  quotation_date date not null default current_date,
  valid_until date,
  service_type text not null,
  service_description text not null,
  currency char(3) not null default 'PEN' check (currency = 'PEN'),
  tax_rate numeric(5,4) not null default 0.18 check (tax_rate between 0 and 1),
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(14,2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  status public.quotation_status not null default 'draft',
  version_number integer not null default 1 check (version_number > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, quotation_code),
  check (valid_until is null or valid_until >= quotation_date)
);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  line_number integer not null check (line_number > 0),
  description text not null check (char_length(trim(description)) >= 3),
  quantity numeric(12,2) not null check (quantity > 0),
  unit text not null default 'servicio',
  unit_price numeric(14,2) not null check (unit_price >= 0),
  line_total numeric(14,2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quotation_id, line_number)
);

create table public.quotation_versions (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  event_type text not null check (event_type in ('created', 'updated', 'status_changed')),
  snapshot jsonb not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (quotation_id, version_number)
);

create table public.quotation_status_history (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  previous_status public.quotation_status,
  new_status public.quotation_status not null,
  comment text,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  changed_at timestamptz not null default now()
);

create index on public.team_members (user_id);
create index on public.clients (team_id);
create index on public.service_locations (team_id, client_id);
create index on public.quotations (team_id, status, quotation_date desc);
create index on public.quotation_versions (quotation_id, version_number desc);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger teams_touch before update on public.teams for each row execute function public.touch_updated_at();
create trigger clients_touch before update on public.clients for each row execute function public.touch_updated_at();
create trigger locations_touch before update on public.service_locations for each row execute function public.touch_updated_at();
create trigger quotations_touch before update on public.quotations for each row execute function public.touch_updated_at();
create trigger items_touch before update on public.quotation_items for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is null or new.email !~* '^[A-Z0-9._%+\-]+@gmail\.com$' then
    raise exception 'Solo se permiten cuentas Gmail';
  end if;
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_team_member(target_team uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where team_id = target_team and user_id = auth.uid())
$$;
create or replace function public.can_edit_team(target_team uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where team_id = target_team and user_id = auth.uid() and role in ('admin','coordinator','operator'))
$$;
create or replace function public.is_team_admin(target_team uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where team_id = target_team and user_id = auth.uid() and role = 'admin')
$$;

create or replace function public.create_team(team_name text) returns uuid language plpgsql security definer set search_path = public as $$
declare created_team uuid;
begin
  insert into public.teams (name, created_by) values (trim(team_name), auth.uid()) returning id into created_team;
  insert into public.team_members (team_id, user_id, role) values (created_team, auth.uid(), 'admin');
  return created_team;
end; $$;

create or replace function public.create_team_invitation(target_team uuid, invitee_email text, invitee_role public.team_role default 'operator') returns uuid language plpgsql security definer set search_path = public as $$
declare invitation_token uuid;
begin
  if not public.is_team_admin(target_team) then raise exception 'No autorizado'; end if;
  if lower(trim(invitee_email)) !~ '^[a-z0-9._%+\-]+@gmail\.com$' then raise exception 'La invitación debe dirigirse a Gmail'; end if;
  insert into public.team_invitations (team_id, email, role, invited_by)
  values (target_team, lower(trim(invitee_email)), invitee_role, auth.uid())
  on conflict (team_id, email) do update set role = excluded.role, token = gen_random_uuid(), invited_by = auth.uid(), expires_at = now() + interval '7 days', accepted_at = null, revoked_at = null
  returning token into invitation_token;
  return invitation_token;
end; $$;

create or replace function public.accept_team_invitation(invitation_token uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare invite public.team_invitations; current_email text;
begin
  select lower(email) into current_email from public.profiles where id = auth.uid();
  select * into invite from public.team_invitations where token = invitation_token and accepted_at is null and revoked_at is null and expires_at > now() for update;
  if invite.id is null or invite.email <> current_email then raise exception 'Invitación inválida o vencida'; end if;
  insert into public.team_members (team_id, user_id, role) values (invite.team_id, auth.uid(), invite.role)
  on conflict (team_id, user_id) do update set role = excluded.role;
  update public.team_invitations set accepted_at = now() where id = invite.id;
  return invite.team_id;
end; $$;

create or replace function public.remove_team_member(target_team uuid, target_user uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_team_admin(target_team) then raise exception 'No autorizado'; end if;
  if target_user = auth.uid() then raise exception 'Un administrador no puede expulsarse a sí mismo'; end if;
  if (select count(*) from public.team_members where team_id = target_team and role = 'admin') = 1 and exists (select 1 from public.team_members where team_id = target_team and user_id = target_user and role = 'admin') then raise exception 'El equipo debe conservar un administrador'; end if;
  delete from public.team_members where team_id = target_team and user_id = target_user;
end; $$;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invitations enable row level security;
alter table public.clients enable row level security;
alter table public.service_locations enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.quotation_versions enable row level security;
alter table public.quotation_status_history enable row level security;

create policy "profile self read" on public.profiles for select using (id = auth.uid());
create policy "profile self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and email = (select email from public.profiles where id = auth.uid()));
create policy "team member read teams" on public.teams for select using (public.is_team_member(id));
create policy "team member read members" on public.team_members for select using (public.is_team_member(team_id));
create policy "admin read invitations" on public.team_invitations for select using (public.is_team_admin(team_id));
create policy "members read clients" on public.clients for select using (public.is_team_member(team_id));
create policy "create clients" on public.clients for insert with check (public.can_edit_team(team_id) and created_by = auth.uid());
create policy "update clients" on public.clients for update using (public.can_edit_team(team_id)) with check (public.can_edit_team(team_id));
create policy "members read locations" on public.service_locations for select using (public.is_team_member(team_id));
create policy "create locations" on public.service_locations for insert with check (public.can_edit_team(team_id) and created_by = auth.uid());
create policy "update locations" on public.service_locations for update using (public.can_edit_team(team_id)) with check (public.can_edit_team(team_id));
create policy "members read quotations" on public.quotations for select using (public.is_team_member(team_id));
create policy "create quotations" on public.quotations for insert with check (public.can_edit_team(team_id) and created_by = auth.uid() and updated_by = auth.uid());
create policy "update quotations" on public.quotations for update using (public.can_edit_team(team_id)) with check (public.can_edit_team(team_id) and updated_by = auth.uid());
create policy "members read quotation items" on public.quotation_items for select using (exists (select 1 from public.quotations q where q.id = quotation_id and public.is_team_member(q.team_id)));
create policy "edit quotation items" on public.quotation_items for all using (exists (select 1 from public.quotations q where q.id = quotation_id and public.can_edit_team(q.team_id))) with check (exists (select 1 from public.quotations q where q.id = quotation_id and public.can_edit_team(q.team_id)));
create policy "members read versions" on public.quotation_versions for select using (public.is_team_member(team_id));
create policy "members read status history" on public.quotation_status_history for select using (exists (select 1 from public.quotations q where q.id = quotation_id and public.is_team_member(q.team_id)));

revoke all on function public.create_team(text) from public;
revoke all on function public.create_team_invitation(uuid, text, public.team_role) from public;
revoke all on function public.accept_team_invitation(uuid) from public;
revoke all on function public.remove_team_member(uuid, uuid) from public;
grant execute on function public.create_team(text), public.create_team_invitation(uuid, text, public.team_role), public.accept_team_invitation(uuid), public.remove_team_member(uuid) to authenticated;
