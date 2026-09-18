-- Explicitly reference the function argument while calculating the yearly code.
-- A quotation row is in scope in this query, so an unqualified quotation_date is ambiguous.
do $$
declare
  function_definition text;
begin
  select pg_get_functiondef(p.oid)
    into function_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_quotation'
    and p.pronargs = 18;

  if function_definition is null then
    raise exception 'No se encontró la función create_quotation';
  end if;

  function_definition := replace(
    function_definition,
    'extract(year from quotation_date)',
    'extract(year from create_quotation.quotation_date)'
  );
  execute function_definition;
end;
$$;
