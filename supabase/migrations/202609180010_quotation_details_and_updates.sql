create or replace function public.get_my_quotation_details()
returns table (
  quotation_id uuid, client_name text, location_name text, address text, latitude numeric, longitude numeric,
  quotation_date date, valid_until date, service_type text, service_description text, status public.quotation_status,
  items jsonb, versions jsonb, history jsonb
)
language sql stable security definer set search_path = public as $$
  select q.id, c.business_name, l.name, coalesce(l.address, ''), l.latitude, l.longitude,
    q.quotation_date, q.valid_until, q.service_type, q.service_description, q.status,
    coalesce((select jsonb_agg(jsonb_build_object('description', i.description, 'quantity', i.quantity, 'price', i.unit_price) order by i.line_number) from public.quotation_items i where i.quotation_id = q.id), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('version', v.version_number, 'event', v.event_type, 'changed_at', v.created_at, 'total', v.snapshot ->> 'total_amount') order by v.version_number desc) from public.quotation_versions v where v.quotation_id = q.id), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('from', h.previous_status, 'to', h.new_status, 'comment', h.comment, 'changed_at', h.changed_at) order by h.changed_at desc) from public.quotation_status_history h where h.quotation_id = q.id), '[]'::jsonb)
  from public.quotations q
  join public.clients c on c.id = q.client_id
  join public.service_locations l on l.id = q.service_location_id
  where public.is_team_member(q.team_id)
$$;

create or replace function public.update_quotation_record(
  target_quotation uuid, new_client_name text, new_location_name text, new_address text,
  new_quotation_date date, new_valid_until date, new_service_type text, new_service_description text,
  new_status public.quotation_status, new_items jsonb, status_comment text default ''
) returns void
language plpgsql security definer set search_path = public as $$
declare q public.quotations%rowtype; i jsonb; line_no integer := 0; subtotal_value numeric(14,2) := 0; tax_value numeric(14,2); next_version integer;
begin
  select * into q from public.quotations where id = target_quotation;
  if not found or not public.can_edit_team(q.team_id) then raise exception 'No autorizado'; end if;
  if char_length(trim(new_client_name)) < 2 or char_length(trim(new_location_name)) < 2 or char_length(trim(new_service_type)) < 2 or char_length(trim(new_service_description)) < 3 then raise exception 'Completa los datos obligatorios'; end if;
  if new_valid_until is not null and new_valid_until < new_quotation_date then raise exception 'La vigencia no puede ser anterior a la fecha'; end if;
  if jsonb_typeof(new_items) <> 'array' or jsonb_array_length(new_items) = 0 then raise exception 'Incluye al menos una partida'; end if;
  foreach i in array array(select value from jsonb_array_elements(new_items)) loop
    if char_length(trim(i ->> 'description')) < 3 or (i ->> 'quantity')::numeric <= 0 or (i ->> 'unit_price')::numeric < 0 then raise exception 'Hay una partida inválida'; end if;
    subtotal_value := subtotal_value + (i ->> 'quantity')::numeric * (i ->> 'unit_price')::numeric;
  end loop;
  tax_value := round(subtotal_value * .18, 2);
  update public.clients set business_name = trim(new_client_name) where id = q.client_id;
  update public.service_locations set name = trim(new_location_name), address = nullif(trim(new_address), '') where id = q.service_location_id;
  update public.quotations set quotation_date = new_quotation_date, valid_until = new_valid_until, service_type = trim(new_service_type), service_description = trim(new_service_description), status = new_status, subtotal = subtotal_value, tax_amount = tax_value, total_amount = subtotal_value + tax_value, updated_by = auth.uid() where id = target_quotation;
  delete from public.quotation_items where quotation_id = target_quotation;
  foreach i in array array(select value from jsonb_array_elements(new_items)) loop
    line_no := line_no + 1;
    insert into public.quotation_items (quotation_id, line_number, description, quantity, unit_price, line_total) values (target_quotation, line_no, trim(i ->> 'description'), (i ->> 'quantity')::numeric, (i ->> 'unit_price')::numeric, round((i ->> 'quantity')::numeric * (i ->> 'unit_price')::numeric, 2));
  end loop;
  select coalesce(max(version_number), 0) + 1 into next_version from public.quotation_versions where quotation_id = target_quotation;
  insert into public.quotation_versions (quotation_id, team_id, version_number, event_type, snapshot, created_by) values (target_quotation, q.team_id, next_version, case when q.status <> new_status then 'status_changed' else 'updated' end, jsonb_build_object('quotation_code', q.quotation_code, 'subtotal', subtotal_value, 'tax_amount', tax_value, 'total_amount', subtotal_value + tax_value, 'items', new_items), auth.uid());
  if q.status <> new_status then insert into public.quotation_status_history (quotation_id, previous_status, new_status, comment, changed_by) values (target_quotation, q.status, new_status, nullif(trim(status_comment), ''), auth.uid()); end if;
end;
$$;

revoke all on function public.get_my_quotation_details(), public.update_quotation_record(uuid, text, text, text, date, date, text, text, public.quotation_status, jsonb, text) from public;
grant execute on function public.get_my_quotation_details(), public.update_quotation_record(uuid, text, text, text, date, date, text, text, public.quotation_status, jsonb, text) to authenticated;
