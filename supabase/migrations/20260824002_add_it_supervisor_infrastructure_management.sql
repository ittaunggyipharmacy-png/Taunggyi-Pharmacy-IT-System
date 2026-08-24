create table if not exists public.network_assets (
  id uuid primary key default gen_random_uuid(), name text not null, asset_type text not null, branch text, location text,
  ip_address text, mac_address text, isp text, provider text, status text not null default 'Active',
  last_checked_at timestamptz, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.cctv_assets (
  id uuid primary key default gen_random_uuid(), name text not null, device_type text not null, branch text, location text,
  channel text, storage_capacity text, retention_days integer, status text not null default 'Active',
  last_checked_at timestamptz, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.backup_recovery_checks (
  id uuid primary key default gen_random_uuid(), backup_date date not null default current_date, backup_type text not null,
  location text, status text not null default 'Success', responsible_person text, recovery_tested boolean not null default false,
  recovery_result text, notes text, created_at timestamptz not null default now()
);
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(), name text not null, service_type text not null, contact_person text,
  phone text, email text, branch text, contract_start date, contract_end date, status text not null default 'Active',
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.maintenance_records (
  id uuid primary key default gen_random_uuid(), asset_name text not null, asset_id uuid, maintenance_type text not null,
  service_date date not null default current_date, technician text, vendor_id uuid references public.vendors(id) on delete set null,
  problem text, action_taken text, cost numeric(12,2), warranty_until date, next_maintenance_date date,
  status text not null default 'Completed', notes text, created_at timestamptz not null default now()
);
create table if not exists public.access_control_register (
  id uuid primary key default gen_random_uuid(), user_name text not null, system_name text not null, role_name text,
  access_level text, approved_by text, granted_at timestamptz, changed_at timestamptz, disabled_at timestamptz,
  status text not null default 'Active', reason text, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists idx_network_assets_branch on public.network_assets(branch);
create index if not exists idx_cctv_assets_branch on public.cctv_assets(branch);
create index if not exists idx_backup_recovery_date on public.backup_recovery_checks(backup_date desc);
create index if not exists idx_maintenance_service_date on public.maintenance_records(service_date desc);
create index if not exists idx_access_register_status on public.access_control_register(status);

alter table public.network_assets enable row level security;
alter table public.cctv_assets enable row level security;
alter table public.backup_recovery_checks enable row level security;
alter table public.vendors enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.access_control_register enable row level security;

create policy "authenticated users can read network assets" on public.network_assets for select to authenticated using (true);
create policy "authenticated users can manage network assets" on public.network_assets for all to authenticated using (true) with check (true);
create policy "authenticated users can read cctv assets" on public.cctv_assets for select to authenticated using (true);
create policy "authenticated users can manage cctv assets" on public.cctv_assets for all to authenticated using (true) with check (true);
create policy "authenticated users can read backup recovery" on public.backup_recovery_checks for select to authenticated using (true);
create policy "authenticated users can manage backup recovery" on public.backup_recovery_checks for all to authenticated using (true) with check (true);
create policy "authenticated users can read vendors" on public.vendors for select to authenticated using (true);
create policy "authenticated users can manage vendors" on public.vendors for all to authenticated using (true) with check (true);
create policy "authenticated users can read maintenance records" on public.maintenance_records for select to authenticated using (true);
create policy "authenticated users can manage maintenance records" on public.maintenance_records for all to authenticated using (true) with check (true);
create policy "authenticated users can read access register" on public.access_control_register for select to authenticated using (true);
create policy "authenticated users can manage access register" on public.access_control_register for all to authenticated using (true) with check (true);
