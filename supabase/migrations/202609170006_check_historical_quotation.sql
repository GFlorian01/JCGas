-- Check import duplicates without granting direct SELECT access to quotations.
create or replace function public.historical_quotation_exists(
  target_team uuid,
  target_date date,
  target_service_type text
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_team_admin(target_team) then
    raise exception 'Solo un administrador puede importar el historial';
  end if;

  return exists (
    select 1
    from public.quotations
    where team_id = target_team
      and quotation_date = target_date
      and service_type = target_service_type
  );
end;
$$;

revoke all on function public.historical_quotation_exists(uuid, date, text) from public;
grant execute on function public.historical_quotation_exists(uuid, date, text) to authenticated;
