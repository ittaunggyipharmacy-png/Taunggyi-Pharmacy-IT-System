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
