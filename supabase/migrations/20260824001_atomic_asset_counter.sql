-- Atomic asset numbering.
-- Keeps the existing asset_counters table and makes number allocation safe
-- when multiple users create assets at the same time.

create or replace function public.next_asset_counter(
  p_counter_id text,
  p_offset integer default 0
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_next integer;
begin
  if p_counter_id is null or trim(p_counter_id) = '' then
    raise exception 'p_counter_id is required';
  end if;

  -- Advisory transaction lock is scoped to this database transaction and
  -- serializes allocations for the same counter without changing the table.
  perform pg_advisory_xact_lock(hashtext(p_counter_id));

  insert into public.asset_counters (id, count, updated_at)
  values (p_counter_id, 1 + greatest(coalesce(p_offset, 0), 0), now())
  on conflict (id) do update
    set count = public.asset_counters.count + 1 + greatest(coalesce(p_offset, 0), 0),
        updated_at = now()
  returning count into v_next;

  return v_next;
end;
$$;

revoke all on function public.next_asset_counter(text, integer) from public;
-- The authenticated app can call the function through Supabase RPC.
grant execute on function public.next_asset_counter(text, integer) to authenticated;
