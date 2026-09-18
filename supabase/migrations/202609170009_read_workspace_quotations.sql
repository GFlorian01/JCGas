-- Return workspace quotations with their display fields in one authorized query.
-- This avoids relying on PostgREST relationship inference in the dashboard.
create or replace function public.get_my_quotations()
returns table (
  id uuid,
  team_id uuid,
  quotation_code text,
  quotation_date date,
  status public.quotation_status,
  total_amount numeric,
  client_name text,
  location_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    q.id,
    q.team_id,
    q.quotation_code,
    q.quotation_date,
    q.status,
    q.total_amount,
    coalesce(c.business_name, 'Cliente eliminado'),
    coalesce(l.name, 'Ubicación eliminada')
  from public.quotations q
  left join public.clients c on c.id = q.client_id
  left join public.service_locations l on l.id = q.service_location_id
  where public.is_team_member(q.team_id)
  order by q.quotation_date desc, q.created_at desc
  limit 100
$$;

revoke all on function public.get_my_quotations() from public;
grant execute on function public.get_my_quotations() to authenticated;
