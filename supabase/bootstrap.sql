-- Fresh database only. Historic schema plus missing prerequisites, excluding installation-specific UID rewrites.
-- Supabase Schema for IT Operations App

-- 1. App Users
CREATE TABLE IF NOT EXISTS app_users (
  uid UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  display_name TEXT,
  photo_url TEXT,
  role TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. System Config
CREATE TABLE IF NOT EXISTS system_config (
  id TEXT PRIMARY KEY,
  departments JSONB DEFAULT '[]',
  locations JSONB DEFAULT '[]',
  asset_categories JSONB DEFAULT '[]',
  pass_labels JSONB DEFAULT '[]',
  branches JSONB DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT PRIMARY KEY,
  allowed_menus JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Password Vault
CREATE TABLE IF NOT EXISTS password_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT,
  account TEXT,
  value TEXT,
  branch TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  description TEXT,
  priority TEXT,
  status TEXT,
  type TEXT,
  department TEXT,
  location TEXT,
  branch TEXT,
  assignee TEXT,
  requester_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- 6. Assets
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT,
  name TEXT,
  category TEXT,
  status TEXT,
  department TEXT,
  location TEXT,
  branch TEXT,
  assignee TEXT,
  purchase_date DATE,
  specs TEXT,
  parent_id UUID REFERENCES assets(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Asset Counters
CREATE TABLE IF NOT EXISTS asset_counters (
  id TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Backups
CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system TEXT,
  status TEXT,
  size TEXT,
  notes TEXT,
  date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. CCTV Requests
CREATE TABLE IF NOT EXISTS cctv_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose TEXT,
  date DATE,
  time_range TEXT,
  status TEXT,
  requester TEXT,
  reviewer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Content Plans
CREATE TABLE IF NOT EXISTS content_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT,
  type TEXT,
  topic TEXT,
  status TEXT,
  publish_date DATE,
  assignee TEXT,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Renewals
CREATE TABLE IF NOT EXISTS renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item TEXT,
  type TEXT,
  expiry_date DATE,
  cost NUMERIC,
  status TEXT,
  order_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item TEXT,
  reason TEXT,
  estimated_cost NUMERIC,
  status TEXT,
  requester TEXT,
  approver TEXT,
  request_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Meeting Minutes
CREATE TABLE IF NOT EXISTS meeting_minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  date DATE,
  type TEXT,
  attendees JSONB DEFAULT '[]',
  agendas JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  decisions JSONB DEFAULT '[]',
  status TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Daily Logs
CREATE TABLE IF NOT EXISTS daily_logs (
  id TEXT PRIMARY KEY,
  date DATE,
  user_id TEXT,
  tasks JSONB DEFAULT '{}',
  custom_tasks JSONB DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Weekly Logs
CREATE TABLE IF NOT EXISTS weekly_logs (
  id TEXT PRIMARY KEY,
  week TEXT,
  user_id TEXT,
  tasks JSONB DEFAULT '{}',
  custom_tasks JSONB DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Monthly Logs
CREATE TABLE IF NOT EXISTS monthly_logs (
  id TEXT PRIMARY KEY,
  month TEXT,
  user_id TEXT,
  tasks JSONB DEFAULT '{}',
  custom_tasks JSONB DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Activities
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT,
  user_name TEXT,
  action TEXT,
  department TEXT,
  details TEXT
);

-- 18. Task Evidence
CREATE TABLE IF NOT EXISTS task_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT,
  log_id TEXT,
  image_url TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT,
  user_name TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. Employees
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT,
  skills JSONB DEFAULT '[]',
  department TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


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

alter table public.app_users
  add column if not exists employee_id text,
  add column if not exists position text,
  add column if not exists department text,
  add column if not exists branch text;

create table if not exists public.asset_assignments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  user_id uuid not null references public.app_users(uid) on delete restrict,
  assigned_date date not null default current_date,
  assigned_by uuid references public.app_users(uid) on delete set null,
  return_date date,
  return_reason text,
  status text not null default 'Active' check (status in ('Active', 'Returned', 'Cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_assignments_return_date_check check (return_date is null or return_date >= assigned_date)
);

create unique index if not exists asset_assignments_one_active_per_asset
  on public.asset_assignments(asset_id)
  where status = 'Active';

create index if not exists asset_assignments_user_id_idx on public.asset_assignments(user_id);
create index if not exists asset_assignments_asset_id_idx on public.asset_assignments(asset_id);
create index if not exists asset_assignments_status_idx on public.asset_assignments(status);

alter table public.asset_assignments enable row level security;

drop policy if exists "Authenticated users can view asset assignments" on public.asset_assignments;
drop policy if exists "Elevated users can insert asset assignments" on public.asset_assignments;
drop policy if exists "Elevated users can update asset assignments" on public.asset_assignments;
drop policy if exists "Elevated users can delete asset assignments" on public.asset_assignments;

create policy "Authenticated users can view asset assignments"
  on public.asset_assignments for select
  to authenticated
  using (true);

create policy "Elevated users can insert asset assignments"
  on public.asset_assignments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.app_users u
      where u.uid = (select auth.uid())
        and coalesce(u.is_admin, false) = true
    )
  );

create policy "Elevated users can update asset assignments"
  on public.asset_assignments for update
  to authenticated
  using (
    exists (
      select 1 from public.app_users u
      where u.uid = (select auth.uid())
        and coalesce(u.is_admin, false) = true
    )
  )
  with check (
    exists (
      select 1 from public.app_users u
      where u.uid = (select auth.uid())
        and coalesce(u.is_admin, false) = true
    )
  );

create policy "Elevated users can delete asset assignments"
  on public.asset_assignments for delete
  to authenticated
  using (
    exists (
      select 1 from public.app_users u
      where u.uid = (select auth.uid())
        and coalesce(u.is_admin, false) = true
    )
  );

revoke all on public.asset_assignments from anon;
grant select, insert, update, delete on public.asset_assignments to authenticated;

alter table public.asset_assignments add column if not exists asset_person_id uuid; alter table public.asset_assignments alter column user_id drop not null;
create table if not exists public.asset_people (
  id uuid primary key default gen_random_uuid(),
  employee_id text,
  full_name text not null,
  position text,
  department text,
  branch text,
  phone text,
  email text,
  status text not null default 'Active',
  notes text,
  linked_user_id uuid references public.app_users(uid) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists asset_people_employee_id_unique
  on public.asset_people(employee_id)
  where employee_id is not null and employee_id <> '';

create index if not exists asset_people_name_idx on public.asset_people(full_name);
create index if not exists asset_people_linked_user_idx on public.asset_people(linked_user_id);

alter table public.asset_assignments
  add constraint asset_assignments_asset_person_fk
  foreign key (asset_person_id) references public.asset_people(id) on delete restrict;

create index if not exists asset_assignments_asset_person_idx
  on public.asset_assignments(asset_person_id);

create or replace function public.set_asset_people_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists asset_people_updated_at on public.asset_people;
create trigger asset_people_updated_at
before update on public.asset_people
for each row execute function public.set_asset_people_updated_at();

alter table public.asset_people enable row level security;

drop policy if exists "Authenticated users can view asset people" on public.asset_people;
create policy "Authenticated users can view asset people"
on public.asset_people for select to authenticated using (true);

drop policy if exists "Elevated users can insert asset people" on public.asset_people;
create policy "Elevated users can insert asset people"
on public.asset_people for insert to authenticated
with check (exists (select 1 from public.app_users u where u.uid = auth.uid() and coalesce(u.is_admin, false) = true));

drop policy if exists "Elevated users can update asset people" on public.asset_people;
create policy "Elevated users can update asset people"
on public.asset_people for update to authenticated
using (exists (select 1 from public.app_users u where u.uid = auth.uid() and coalesce(u.is_admin, false) = true))
with check (exists (select 1 from public.app_users u where u.uid = auth.uid() and coalesce(u.is_admin, false) = true));

drop policy if exists "Elevated users can delete asset people" on public.asset_people;
create policy "Elevated users can delete asset people"
on public.asset_people for delete to authenticated
using (exists (select 1 from public.app_users u where u.uid = auth.uid() and coalesce(u.is_admin, false) = true));

-- Fix duplicate foreign-key relationships on asset_assignments.asset_person_id.
-- PostgREST cannot infer which relationship to use when embedding asset_people
-- if both constraints exist, causing the By User assignment detail query to fail.

alter table public.asset_assignments
  drop constraint if exists asset_assignments_asset_person_fk;

-- Keep the canonical constraint created by the original asset-assignment schema:
-- asset_assignments_asset_person_id_fkey -> public.asset_people(id)

-- IT Announcements table (was referenced by src/services/itAnnouncementService.ts
-- but never created, which is why the "IT Announcements" feature has never worked)

create table if not exists public.it_announcements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(uid) on delete cascade,
  user_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists it_announcements_created_at_idx
  on public.it_announcements(created_at desc);

alter table public.it_announcements enable row level security;

-- Everyone signed in can read announcements (module is visible to all roles in AccessControlContext)
drop policy if exists "Authenticated users can view IT announcements" on public.it_announcements;
create policy "Authenticated users can view IT announcements"
on public.it_announcements for select to authenticated using (true);

-- Only IT Supervisor / Admin roles can post (matches isAdmin gate in the UI)
drop policy if exists "Admins can insert IT announcements" on public.it_announcements;
create policy "Admins can insert IT announcements"
on public.it_announcements for insert to authenticated
with check (
  exists (
    select 1 from public.app_users u
    where u.uid = auth.uid() and coalesce(u.is_admin, false) = true
  )
);

-- Only Admins can delete/edit if needed later
drop policy if exists "Admins can delete IT announcements" on public.it_announcements;
create policy "Admins can delete IT announcements"
on public.it_announcements for delete to authenticated
using (
  exists (
    select 1 from public.app_users u
    where u.uid = auth.uid() and coalesce(u.is_admin, false) = true
  )
);

-- Add a unique username for app login while keeping Supabase Auth as the credential authority.
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS username text;

CREATE UNIQUE INDEX IF NOT EXISTS app_users_username_lower_unique
  ON public.app_users (lower(username))
  WHERE username IS NOT NULL;

UPDATE public.app_users
SET username = CASE
  WHEN lower(email) = 'tgpadmin@taunggyipharmacy.com' THEN 'Tgpadmin'
  WHEN lower(email) = 'it.taunggyipharmacy@gmail.com' THEN 'itdigital'
  ELSE username
END
WHERE username IS NULL OR username = '';

alter table public.asset_assignments add constraint asset_assignments_asset_person_id_fkey foreign key(asset_person_id) references public.asset_people(id) on delete restrict;