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
