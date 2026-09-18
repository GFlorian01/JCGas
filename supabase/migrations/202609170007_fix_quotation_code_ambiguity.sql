-- Disambiguate the local quotation_code variable from quotations.quotation_code.
-- The function is transactional, so previous failed imports did not persist partial data.
create or replace function public.create_quotation(
  target_team uuid,
  client_name text,
  client_ruc text,
  client_contact_name text,
  client_contact_email text,
  client_contact_phone text,
  location_name text,
  location_address text,
  location_district text,
  location_province text,
  location_department text,
  location_latitude numeric,
  location_longitude numeric,
  quotation_date date,
  quotation_valid_until date,
  quotation_service_type text,
  quotation_service_description text,
  quotation_items jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_client uuid;
  created_location uuid;
  created_quotation uuid;
  item jsonb;
  item_number integer := 0;
  item_description text;
  item_quantity numeric(12, 2);
  item_unit_price numeric(14, 2);
  subtotal numeric(14, 2) := 0;
  tax_amount numeric(14, 2);
  quotation_code text;
  next_number integer;
begin
  if auth.uid() is null or not public.can_edit_team(target_team) then raise exception 'No autorizado'; end if;
  if char_length(trim(client_name)) = 0 or char_length(trim(location_name)) = 0 then raise exception 'El cliente y la ubicación son obligatorios'; end if;
  if char_length(trim(quotation_service_type)) = 0 or char_length(trim(quotation_service_description)) < 3 then raise exception 'El tipo y la descripción del servicio son obligatorios'; end if;
  if quotation_valid_until is not null and quotation_valid_until < quotation_date then raise exception 'La vigencia no puede ser anterior a la fecha de cotización'; end if;
  if jsonb_typeof(quotation_items) <> 'array' or jsonb_array_length(quotation_items) = 0 then raise exception 'Incluye al menos una partida'; end if;
  if (location_latitude is null) <> (location_longitude is null) or location_latitude not between -90 and 90 or location_longitude not between -180 and 180 then raise exception 'Las coordenadas no son válidas'; end if;

  insert into public.clients (team_id, business_name, ruc, contact_name, contact_email, contact_phone, created_by)
  values (target_team, trim(client_name), nullif(trim(client_ruc), ''), nullif(trim(client_contact_name), ''), nullif(trim(client_contact_email), ''), nullif(trim(client_contact_phone), ''), auth.uid())
  on conflict (team_id, business_name) do update set ruc = coalesce(excluded.ruc, clients.ruc), contact_name = coalesce(excluded.contact_name, clients.contact_name), contact_email = coalesce(excluded.contact_email, clients.contact_email), contact_phone = coalesce(excluded.contact_phone, clients.contact_phone)
  returning id into created_client;

  insert into public.service_locations (team_id, client_id, name, address, district, province, department, latitude, longitude, created_by)
  values (target_team, created_client, trim(location_name), nullif(trim(location_address), ''), nullif(trim(location_district), ''), nullif(trim(location_province), ''), nullif(trim(location_department), ''), location_latitude, location_longitude, auth.uid())
  on conflict (team_id, client_id, name) do update set address = coalesce(excluded.address, service_locations.address), district = coalesce(excluded.district, service_locations.district), province = coalesce(excluded.province, service_locations.province), department = coalesce(excluded.department, service_locations.department), latitude = coalesce(excluded.latitude, service_locations.latitude), longitude = coalesce(excluded.longitude, service_locations.longitude)
  returning id into created_location;

  foreach item in array array(select value from jsonb_array_elements(quotation_items)) loop
    item_number := item_number + 1;
    item_description := trim(item ->> 'description'); item_quantity := (item ->> 'quantity')::numeric; item_unit_price := (item ->> 'unit_price')::numeric;
    if char_length(item_description) < 3 or item_quantity <= 0 or item_unit_price < 0 then raise exception 'La partida % no es válida', item_number; end if;
    subtotal := subtotal + item_quantity * item_unit_price;
  end loop;

  perform pg_advisory_xact_lock(hashtextextended(target_team::text, 0));
  select coalesce(max((substring(q.quotation_code from '[0-9]+$'))::integer), 0) + 1
    into next_number
    from public.quotations q
    where q.team_id = target_team and q.quotation_code like format('COT-%s-%%', extract(year from create_quotation.quotation_date)::integer);
  quotation_code := format('COT-%s-%s', extract(year from create_quotation.quotation_date)::integer, lpad(next_number::text, 4, '0'));
  tax_amount := round(subtotal * 0.18, 2);

  insert into public.quotations (team_id, quotation_code, client_id, service_location_id, quotation_date, valid_until, service_type, service_description, subtotal, tax_amount, total_amount, created_by, updated_by)
  values (target_team, quotation_code, created_client, created_location, quotation_date, quotation_valid_until, trim(quotation_service_type), trim(quotation_service_description), subtotal, tax_amount, subtotal + tax_amount, auth.uid(), auth.uid())
  returning id into created_quotation;

  item_number := 0;
  foreach item in array array(select value from jsonb_array_elements(quotation_items)) loop
    item_number := item_number + 1;
    insert into public.quotation_items (quotation_id, line_number, description, quantity, unit_price, line_total)
    values (created_quotation, item_number, trim(item ->> 'description'), (item ->> 'quantity')::numeric, (item ->> 'unit_price')::numeric, round((item ->> 'quantity')::numeric * (item ->> 'unit_price')::numeric, 2));
  end loop;

  insert into public.quotation_versions (quotation_id, team_id, version_number, event_type, snapshot, created_by)
  values (created_quotation, target_team, 1, 'created', jsonb_build_object('quotation_code', quotation_code, 'subtotal', subtotal, 'tax_amount', tax_amount, 'total_amount', subtotal + tax_amount, 'items', quotation_items), auth.uid());
  insert into public.quotation_status_history (quotation_id, previous_status, new_status, comment, changed_by)
  values (created_quotation, null, 'draft', 'Cotización creada', auth.uid());
  return created_quotation;
end;
$$;
