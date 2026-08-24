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
