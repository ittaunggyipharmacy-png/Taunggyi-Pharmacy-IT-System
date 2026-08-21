-- Pharmacy IT Management System: Supabase foundation
-- Apply this migration in the authorized Supabase project's SQL Editor.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum (
    'super_admin', 'it_supervisor', 'finance_manager',
    'asset_editor', 'document_manager', 'staff_viewer', 'disabled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
  create type public.ticket_priority as enum ('low', 'medium', 'high', 'critical');
  create type public.asset_status as enum ('in_stock', 'assigned', 'maintenance', 'retired', 'disposed');
  create type public.access_request_status as enum ('submitted', 'manager_review', 'it_review', 'provisioning', 'active', 'revoked', 'rejected');
  create type public.procurement_status as enum ('draft', 'submitted', 'manager_review', 'finance_review', 'approved', 'po_issued', 'partially_received', 'received', 'matched', 'paid', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.app_role not null default 'staff_viewer',
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.asset_code_sequences (
  code_prefix text primary key,
  next_value integer not null default 1 check (next_value > 0)
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_code text not null unique,
  category text not null,
  brand text,
  model text not null,
  serial_number text,
  specifications jsonb not null default '{}'::jsonb,
  purchase_date date,
  purchase_cost numeric(14,2),
  warranty_expiry date,
  status public.asset_status not null default 'in_stock',
  assigned_profile_id uuid references public.profiles(id),
  department_id uuid references public.departments(id),
  location_id uuid references public.locations(id),
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_movements (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  movement_type text not null check (movement_type in ('registered', 'assigned', 'transferred', 'returned', 'maintenance', 'disposed')),
  from_profile_id uuid references public.profiles(id),
  to_profile_id uuid references public.profiles(id),
  from_location_id uuid references public.locations(id),
  to_location_id uuid references public.locations(id),
  notes text,
  performed_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint generated always as identity unique,
  subject text not null,
  description text not null,
  priority public.ticket_priority not null default 'medium',
  status public.ticket_status not null default 'open',
  requester_id uuid not null references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  department_id uuid references public.departments(id),
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  request_number bigint generated always as identity unique,
  requester_id uuid not null references public.profiles(id),
  resource_name text not null,
  resource_category text not null,
  requested_access_level text not null,
  data_sensitivity text not null check (data_sensitivity in ('low', 'medium', 'high', 'restricted')),
  business_reason text not null,
  status public.access_request_status not null default 'submitted',
  expiry_date date,
  provision_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.access_request_audits (
  id uuid primary key default gen_random_uuid(),
  access_request_id uuid not null references public.access_requests(id) on delete cascade,
  action text not null check (action in ('submitted', 'reviewed', 'approved', 'rejected', 'provisioned', 'revoked')),
  from_status public.access_request_status,
  to_status public.access_request_status,
  actor_id uuid not null references public.profiles(id),
  comment text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  contact_name text,
  email text,
  phone text,
  payment_terms text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_requisitions (
  id uuid primary key default gen_random_uuid(),
  requisition_number bigint generated always as identity unique,
  requester_id uuid not null references public.profiles(id),
  department_id uuid references public.departments(id),
  purpose text not null,
  required_by date,
  status public.procurement_status not null default 'draft',
  currency text not null default 'MMK',
  subtotal numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_requisition_items (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references public.purchase_requisitions(id) on delete cascade,
  item_name text not null,
  category text,
  quantity numeric(12,2) not null check (quantity > 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  tax_rate numeric(5,2) not null default 0 check (tax_rate >= 0),
  line_total numeric(14,2) not null default 0
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number bigint generated always as identity unique,
  requisition_id uuid not null references public.purchase_requisitions(id),
  supplier_id uuid not null references public.suppliers(id),
  status public.procurement_status not null default 'po_issued',
  issued_by uuid not null references public.profiles(id),
  issued_at timestamptz not null default now(),
  expected_delivery_date date,
  total_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  requisition_item_id uuid references public.purchase_requisition_items(id),
  item_name text not null,
  quantity numeric(12,2) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  line_total numeric(14,2) not null check (line_total >= 0)
);

create table if not exists public.goods_receipts (
  id uuid primary key default gen_random_uuid(),
  grn_number bigint generated always as identity unique,
  purchase_order_id uuid not null references public.purchase_orders(id),
  received_by uuid not null references public.profiles(id),
  received_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.goods_receipt_items (
  id uuid primary key default gen_random_uuid(),
  goods_receipt_id uuid not null references public.goods_receipts(id) on delete cascade,
  purchase_order_item_id uuid not null references public.purchase_order_items(id),
  quantity_received numeric(12,2) not null check (quantity_received >= 0),
  accepted boolean not null default true,
  notes text
);

create table if not exists public.invoice_matches (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id),
  invoice_number text not null,
  invoice_date date not null,
  invoice_amount numeric(14,2) not null check (invoice_amount >= 0),
  po_amount numeric(14,2) not null check (po_amount >= 0),
  received_amount numeric(14,2) not null check (received_amount >= 0),
  matched boolean not null default false,
  mismatch_reason text,
  reviewed_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.renewals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  supplier_id uuid references public.suppliers(id),
  renewal_date date not null,
  cost numeric(14,2),
  owner_id uuid references public.profiles(id),
  status text not null default 'active' check (status in ('active', 'renewed', 'cancelled', 'expired')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.meeting_minutes (
  id uuid primary key default gen_random_uuid(),
  meeting_date date not null,
  title text not null,
  attendees text[] not null default '{}',
  notes text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meeting_action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meeting_minutes(id) on delete cascade,
  description text not null,
  owner_id uuid references public.profiles(id),
  due_date date,
  completed boolean not null default false,
  completed_at timestamptz
);

create table if not exists public.managed_documents (
  id uuid primary key default gen_random_uuid(),
  drive_file_id text not null unique,
  drive_parent_id text not null,
  name text not null,
  mime_type text not null,
  web_view_url text,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  settings_key text primary key,
  settings_value jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() and approved = true $$;

create or replace function public.is_approved_user()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and approved = true and role <> 'disabled') $$;

create or replace function public.is_role_allowed(allowed public.app_role[])
returns boolean
language sql stable security definer set search_path = public
as $$ select public.current_app_role() = any(allowed) $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do update set email = excluded.email, full_name = coalesce(excluded.full_name, public.profiles.full_name), updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.assign_asset_code()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  prefix text;
  sequence_value integer;
begin
  prefix := case lower(new.category)
    when 'computer' then 'TP-PC'
    when 'printer' then 'TP-PR'
    when 'phone' then 'TP-PH'
    when 'mobile' then 'TP-PH'
    when 'scanner' then 'TP-SC'
    when 'network' then 'TP-NW'
    else 'TP-IT'
  end;

  insert into public.asset_code_sequences (code_prefix, next_value)
  values (prefix, 2)
  on conflict (code_prefix) do update
    set next_value = public.asset_code_sequences.next_value + 1
  returning next_value - 1 into sequence_value;

  new.asset_code := prefix || '-' || lpad(sequence_value::text, 5, '0');
  return new;
end;
$$;

drop trigger if exists before_asset_insert on public.assets;
create trigger before_asset_insert
  before insert on public.assets
  for each row execute procedure public.assign_asset_code();

create or replace function public.prevent_access_audit_mutation()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  raise exception 'Access-request audit records are immutable';
end; $$;

drop trigger if exists access_audit_immutable on public.access_request_audits;
create trigger access_audit_immutable
  before update or delete on public.access_request_audits
  for each row execute procedure public.prevent_access_audit_mutation();

alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.locations enable row level security;
alter table public.assets enable row level security;
alter table public.asset_movements enable row level security;
alter table public.tickets enable row level security;
alter table public.access_requests enable row level security;
alter table public.access_request_audits enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchase_requisitions enable row level security;
alter table public.purchase_requisition_items enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.goods_receipts enable row level security;
alter table public.goods_receipt_items enable row level security;
alter table public.invoice_matches enable row level security;
alter table public.renewals enable row level security;
alter table public.meeting_minutes enable row level security;
alter table public.meeting_action_items enable row level security;
alter table public.managed_documents enable row level security;
alter table public.system_settings enable row level security;

create policy "Profiles are visible to approved users" on public.profiles for select using (public.is_approved_user());
create policy "Administrators manage profiles" on public.profiles for update using (public.is_role_allowed(array['super_admin']::public.app_role[])) with check (public.is_role_allowed(array['super_admin']::public.app_role[]));
create policy "Approved users read reference data" on public.departments for select using (public.is_approved_user());
create policy "Approved users read locations" on public.locations for select using (public.is_approved_user());
create policy "Administrators manage departments" on public.departments for all using (public.is_role_allowed(array['super_admin']::public.app_role[])) with check (public.is_role_allowed(array['super_admin']::public.app_role[]));
create policy "Administrators manage locations" on public.locations for all using (public.is_role_allowed(array['super_admin']::public.app_role[])) with check (public.is_role_allowed(array['super_admin']::public.app_role[]));
create policy "Approved users read assets" on public.assets for select using (public.is_approved_user());
create policy "Asset operators manage assets" on public.assets for all using (public.is_role_allowed(array['super_admin','it_supervisor','asset_editor']::public.app_role[])) with check (public.is_role_allowed(array['super_admin','it_supervisor','asset_editor']::public.app_role[]));
create policy "Approved users read asset movements" on public.asset_movements for select using (public.is_approved_user());
create policy "Asset operators add asset movements" on public.asset_movements for insert with check (public.is_role_allowed(array['super_admin','it_supervisor','asset_editor']::public.app_role[]));
create policy "Users read relevant tickets" on public.tickets for select using (requester_id = auth.uid() or assigned_to = auth.uid() or public.is_role_allowed(array['super_admin','it_supervisor']::public.app_role[]));
create policy "Approved users submit tickets" on public.tickets for insert with check (requester_id = auth.uid() and public.is_approved_user());
create policy "IT operators update tickets" on public.tickets for update using (public.is_role_allowed(array['super_admin','it_supervisor']::public.app_role[]));
create policy "Users read relevant access requests" on public.access_requests for select using (requester_id = auth.uid() or public.is_role_allowed(array['super_admin','it_supervisor']::public.app_role[]));
create policy "Approved users submit access requests" on public.access_requests for insert with check (requester_id = auth.uid() and public.is_approved_user());
create policy "IT operators update access requests" on public.access_requests for update using (public.is_role_allowed(array['super_admin','it_supervisor']::public.app_role[]));
create policy "Authorized users read access audits" on public.access_request_audits for select using (public.is_role_allowed(array['super_admin','it_supervisor']::public.app_role[]) or exists (select 1 from public.access_requests r where r.id = access_request_id and r.requester_id = auth.uid()));
create policy "Procurement users read requisitions" on public.purchase_requisitions for select using (requester_id = auth.uid() or public.is_role_allowed(array['super_admin','it_supervisor','finance_manager']::public.app_role[]));
create policy "Approved users create their requisitions" on public.purchase_requisitions for insert with check (requester_id = auth.uid() and public.is_approved_user());
create policy "Approvers update requisitions" on public.purchase_requisitions for update using (public.is_role_allowed(array['super_admin','it_supervisor','finance_manager']::public.app_role[]));
create policy "Approved users read renewals" on public.renewals for select using (public.is_approved_user());
create policy "IT and finance manage renewals" on public.renewals for all using (public.is_role_allowed(array['super_admin','it_supervisor','finance_manager']::public.app_role[])) with check (public.is_role_allowed(array['super_admin','it_supervisor','finance_manager']::public.app_role[]));
create policy "Approved users read meetings" on public.meeting_minutes for select using (public.is_approved_user());
create policy "Approved users create meetings" on public.meeting_minutes for insert with check (created_by = auth.uid() and public.is_approved_user());
create policy "Meeting owners and administrators update meetings" on public.meeting_minutes for update using (created_by = auth.uid() or public.is_role_allowed(array['super_admin','it_supervisor']::public.app_role[]));
create policy "Approved users read documents" on public.managed_documents for select using (public.is_approved_user());
create policy "Document managers manage documents" on public.managed_documents for all using (public.is_role_allowed(array['super_admin','it_supervisor','document_manager']::public.app_role[])) with check (public.is_role_allowed(array['super_admin','it_supervisor','document_manager']::public.app_role[]));
create policy "Administrators manage system settings" on public.system_settings for all using (public.is_role_allowed(array['super_admin']::public.app_role[])) with check (public.is_role_allowed(array['super_admin']::public.app_role[]));

-- Remaining procurement child tables are written through controlled server-side procedures using the secret key.
-- Do not add direct browser write policies for procurement child records, access audits, or document actions.
