-- The sequence table is internal to the security-definer asset-code trigger.
-- No browser roles receive direct policies for this table.
alter table public.asset_code_sequences enable row level security;
