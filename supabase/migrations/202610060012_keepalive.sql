-- Real (successful) database query for the daily keep-alive cron, callable without a session.
create or replace function public.keepalive() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teams)
$$;
revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
