-- Apply after the historical schema; transactionality prevents partially installed controls.

begin;

create schema if not exists app_private;

revoke all on schema app_private from public;

grant usage on schema app_private to authenticated;

create or replace function app_private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$

 select auth.uid() is not null and exists(select 1 from public.app_users where uid=auth.uid() and lower(role)='system admin');

$$;

create or replace function app_private.is_it() returns boolean language sql stable security definer set search_path = '' as $$

 select auth.uid() is not null and exists(select 1 from public.app_users where uid=auth.uid() and lower(role) in ('system admin','it supervisor'));

$$;

revoke all on function app_private.is_admin(), app_private.is_it() from public;

grant execute on function app_private.is_admin(), app_private.is_it() to authenticated;

-- Enforce profile ownership without relying on user-editable JWT metadata.

create or replace function app_private.guard_profile() returns trigger language plpgsql security invoker set search_path = '' as $$

begin

 if current_user in ('postgres','service_role') then return new; end if;

 if tg_op='INSERT' and not app_private.is_admin() and (new.uid<>auth.uid() or new.role<>'Staff' or new.is_admin) then raise exception 'Administrator privileges required'; end if;

 if tg_op='UPDATE' and not app_private.is_admin() and (new.uid is distinct from old.uid or new.role is distinct from old.role or new.is_admin is distinct from old.is_admin or new.email is distinct from old.email) then raise exception 'Administrator privileges required'; end if;

 return new;

end $$;

drop trigger if exists profile_privilege_guard on public.app_users;

create trigger profile_privilege_guard before insert or update on public.app_users for each row execute function app_private.guard_profile();

-- Replace permissive policies, which otherwise combine with new policies using OR.

do $$ declare t text; p record; begin

 foreach t in array array['app_users','role_permissions','system_config','password_vault','network_assets','cctv_assets','backup_recovery_checks','vendors','maintenance_records','access_control_register','assets','asset_people','asset_assignments','asset_counters','purchases','backups','cctv_requests','daily_logs','weekly_logs','monthly_logs','activities','task_evidence','tickets','renewals','content_plans','meeting_minutes','employees','it_announcements'] loop

 if to_regclass('public.'||t) is null then continue; end if;

 execute format('alter table public.%I enable row level security',t);

 execute format('revoke all on public.%I from anon',t);

 execute format('grant select,insert,update,delete on public.%I to authenticated',t);

 for p in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy %I on public.%I',p.policyname,t); end loop;

 if t='app_users' then

 execute 'create policy profile_read on public.app_users for select to authenticated using(uid=auth.uid() or app_private.is_it())';

 execute 'create policy profile_insert on public.app_users for insert to authenticated with check(uid=auth.uid() or app_private.is_admin())';

 execute 'create policy profile_update on public.app_users for update to authenticated using(uid=auth.uid() or app_private.is_admin()) with check(uid=auth.uid() or app_private.is_admin())';

 elsif t in ('daily_logs','weekly_logs','monthly_logs','task_evidence') then

 execute format('create policy owner_records on public.%I for all to authenticated using(user_id=auth.uid()::text or app_private.is_it()) with check(user_id=auth.uid()::text or app_private.is_it())',t);

 elsif t='activities' then

 execute 'create policy activity_read on public.activities for select to authenticated using(user_id=auth.uid()::text or app_private.is_it())';

 execute 'create policy activity_insert on public.activities for insert to authenticated with check(user_id=auth.uid()::text)';

 elsif t='password_vault' then

 -- Credentials are accessed only through the authenticated server, never directly through the Data API.

 execute 'revoke all on public.password_vault from authenticated';

 elsif t in ('role_permissions','system_config') then

 execute format('create policy config_read on public.%I for select to authenticated using(true)',t);

 execute format('create policy config_write on public.%I for all to authenticated using(app_private.is_admin()) with check(app_private.is_admin())',t);

 else

 execute format('create policy it_manage on public.%I for all to authenticated using(app_private.is_it()) with check(app_private.is_it())',t);

 if t in ('assets','asset_people','asset_assignments','employees','it_announcements') then execute format('create policy staff_read on public.%I for select to authenticated using(true)',t); end if;

 if t in ('content_plans','meeting_minutes') then execute format('create policy team_manage on public.%I for all to authenticated using(exists(select 1 from public.app_users u where u.uid=auth.uid() and u.role in (''Merchandising Supervisor'',''IT Digital Marketing''))) with check(exists(select 1 from public.app_users u where u.uid=auth.uid() and u.role in (''Merchandising Supervisor'',''IT Digital Marketing'')))',t); end if;

 end if;

 end loop;

end $$;

insert into public.role_permissions(role,allowed_menus) values

 ('IT Supervisor','{"dashboard":true,"tickets":true,"assets":true,"asset-users":true,"security":true,"renewals":true,"purchases":true,"files":true,"kpi":true,"daily-kpi":true,"reports":true,"skills":true,"meetings":true,"it-ping":true,"cmd-catalogues":true,"id-layout":true,"help":true}'),

 ('IT SUPERVISOR','{"dashboard":true,"tickets":true,"assets":true,"asset-users":true,"security":true,"renewals":true,"purchases":true,"files":true,"kpi":true,"daily-kpi":true,"reports":true,"skills":true,"meetings":true,"it-ping":true,"cmd-catalogues":true,"id-layout":true,"help":true}'),

 ('Staff','{"assets":true,"asset-users":true,"cmd-catalogues":true,"it-ping":true,"help":true}'),

 ('Merchandising Supervisor','{"daily-kpi":true,"marketing":true,"meetings":true,"it-ping":true,"cmd-catalogues":true,"help":true}'),

 ('IT Digital Marketing','{"daily-kpi":true,"marketing":true,"meetings":true,"it-ping":true,"cmd-catalogues":true,"help":true}')

 on conflict(role) do nothing;

create table if not exists public.kpi_metrics(id text primary key, metrics jsonb not null default '[]');

alter table public.kpi_metrics enable row level security;

grant select,insert,update on public.kpi_metrics to authenticated;

create policy kpi_it on public.kpi_metrics for all to authenticated using(app_private.is_it()) with check(app_private.is_it());

alter table public.system_config add column if not exists "itContacts" jsonb default '[]', add column if not exists "branchNotes" jsonb default '[]';

alter table public.purchases add column if not exists category text, add column if not exists price numeric, add column if not exists currency text default 'MMK', add column if not exists quantity integer default 1, add column if not exists date date, add column if not exists supplier text, add column if not exists "supplierContact" text, add column if not exists remarks text, add column if not exists "serialNumber" text, add column if not exists "syncToInventory" boolean default false;

alter table public.assets add column if not exists purchase_record_id uuid references public.purchases(id), add column if not exists purchase_unit integer;

create unique index if not exists assets_purchase_unit on public.assets(purchase_record_id,purchase_unit);

-- Duplicate legacy codes must be resolved explicitly; never silently relabel existing equipment.

create unique index if not exists assets_unique_code on public.assets(code) where code is not null and code<>'';

create or replace function public.allocate_asset_code(category_name text) returns text language plpgsql security invoker set search_path = '' as $$

declare prefix text; n integer; begin

 if not app_private.is_it() then raise exception 'IT access required'; end if;

 prefix := case lower(category_name) when 'computer' then 'TG-PC-' when 'keyboard' then 'TG-KB-' when 'mouse' then 'TG-MS-' when 'fan' then 'TG-FN-' when 'usb hub' then 'TG-UB-' when 'usb' then 'TG-UB-' when 'printer' then 'TG-PR-' when 'phone' then 'TG-PH-' when 'mobile' then 'TG-PH-' when 'scanner' then 'TG-SC-' else 'TG-ACC-' end;

 insert into public.asset_counters(id,count) values(prefix,1) on conflict(id) do update set count=public.asset_counters.count+1 returning count into n;

 while exists(select 1 from public.assets where code=prefix||lpad(n::text,greatest(3,length(n::text)),'0')) loop

 update public.asset_counters set count=count+1 where id=prefix returning count into n;

 end loop;

 return prefix||lpad(n::text,greatest(3,length(n::text)),'0');

end $$;

create or replace function public.assign_asset_person(asset_id_arg uuid, person_id_arg uuid, assigned_date_arg date, notes_arg text) returns uuid language plpgsql security invoker set search_path = '' as $$

declare person public.asset_people; asset public.assets; assignment_id uuid; begin

 if not app_private.is_it() then raise exception 'IT access required'; end if;

 select * into strict asset from public.assets where id=asset_id_arg for update;

 select * into strict person from public.asset_people where id=person_id_arg and status='Active';

 if asset.status not in ('Active','In Stock','New') then raise exception 'Asset cannot be assigned'; end if;

 insert into public.asset_assignments(asset_id,asset_person_id,assigned_date,assigned_by,notes,status) values(asset_id_arg,person_id_arg,assigned_date_arg,auth.uid(),notes_arg,'Active') returning id into assignment_id;

 update public.assets set assignee=person.full_name,department=person.department,location=person.branch,branch=person.branch,updated_at=now() where id=asset_id_arg;

 return assignment_id;

end $$;

create or replace function public.return_asset_assignment(assignment_id_arg uuid, return_date_arg date, reason_arg text, notes_arg text) returns void language plpgsql security invoker set search_path = '' as $$

declare a public.asset_assignments; begin

 if not app_private.is_it() then raise exception 'IT access required'; end if;

 select * into strict a from public.asset_assignments where id=assignment_id_arg for update;

 if a.status<>'Active' then raise exception 'Assignment is no longer active'; end if;

 update public.asset_assignments set status='Returned',return_date=return_date_arg,return_reason=reason_arg,notes=coalesce(notes_arg,notes),updated_at=now() where id=assignment_id_arg;

 update public.assets set assignee='Unassigned',updated_at=now() where id=a.asset_id;

end $$;

create or replace function public.save_asset_record(record jsonb) returns uuid language plpgsql security invoker set search_path = '' as $$

declare a public.assets; holder uuid; active_holder uuid; holder_count integer; begin

 if not app_private.is_it() then raise exception 'IT access required'; end if;

 select * into a from public.assets where id=(record->>'id')::uuid for update;

 a:=jsonb_populate_record(a,record);

 a.id:=coalesce(a.id,gen_random_uuid()); a.code:=coalesce(nullif(a.code,''),public.allocate_asset_code(a.category));

 insert into public.assets(id,code,name,category,status,department,location,assignee,purchase_date,specs,parent_id) values(a.id,a.code,a.name,a.category,a.status,a.department,a.location,a.assignee,a.purchase_date,a.specs,a.parent_id)

 on conflict(id) do update set code=excluded.code,name=excluded.name,category=excluded.category,status=excluded.status,department=excluded.department,location=excluded.location,assignee=excluded.assignee,purchase_date=excluded.purchase_date,specs=excluded.specs,parent_id=excluded.parent_id,updated_at=now();

 if coalesce(a.assignee,'') not in ('','Unassigned') and coalesce(a.status,'') not in ('Disposed','Purged') then

 perform pg_advisory_xact_lock(hashtext(lower(a.assignee)));

 select count(*) into holder_count from public.asset_people where lower(full_name)=lower(a.assignee);

 if holder_count>1 then raise exception 'Multiple people have this name. Assign by Asset Person instead.'; end if;

 select id into holder from public.asset_people where lower(full_name)=lower(a.assignee);

 if holder is null then insert into public.asset_people(full_name,department,branch) values(a.assignee,a.department,a.location) returning id into holder; end if;

 end if;

 select asset_person_id into active_holder from public.asset_assignments where asset_id=a.id and status='Active';

 if active_holder is distinct from holder then

 update public.asset_assignments set status='Returned',return_date=greatest(current_date,assigned_date),return_reason='Updated asset holder',updated_at=now() where asset_id=a.id and status='Active';

 if holder is not null then perform public.assign_asset_person(a.id,holder,current_date,null); end if;

 end if;

 return a.id;

end $$;

create or replace function public.import_asset_records(records jsonb) returns jsonb language plpgsql security invoker set search_path = '' as $$

declare r jsonb; new_id uuid; result jsonb:='[]'; begin

 if jsonb_array_length(records)>1000 then raise exception 'Import up to 1000 rows per batch'; end if;

 for r in select value from jsonb_array_elements(records) loop

 if nullif(r->>'name','') is null then raise exception 'Asset name is required'; end if;

 new_id:=public.save_asset_record(r);

 result:=result || (select to_jsonb(a) from public.assets a where a.id=new_id);

 end loop;

 return result;

end $$;

create or replace function public.save_purchase_record(record jsonb) returns uuid language plpgsql security invoker set search_path = '' as $$

declare p public.purchases; i integer; asset_id uuid; linked integer; begin

 if not app_private.is_it() then raise exception 'IT access required'; end if;

 perform pg_advisory_xact_lock(hashtext(record->>'id'));

 p:=jsonb_populate_record(null::public.purchases,record);

 if p.quantity is null or p.quantity<1 or p.quantity>1000 or p.price<0 or nullif(p.item,'') is null then raise exception 'Invalid item, quantity or price'; end if;

 select count(*) into linked from public.assets where purchase_record_id=p.id;

 if linked>0 and (not coalesce(p."syncToInventory",false) or p.status<>'Received' or p.quantity<>linked) then raise exception 'Received inventory exists. Adjust assets explicitly before changing receipt quantity or status.'; end if;

 insert into public.purchases(id,item,category,price,currency,quantity,date,request_date,supplier,"supplierContact",status,remarks,"serialNumber","syncToInventory") values(p.id,p.item,p.category,p.price,p.currency,p.quantity,p.date,p.date,p.supplier,p."supplierContact",p.status,p.remarks,p."serialNumber",p."syncToInventory")

 on conflict(id) do update set item=excluded.item,category=excluded.category,price=excluded.price,currency=excluded.currency,quantity=excluded.quantity,date=excluded.date,request_date=excluded.request_date,supplier=excluded.supplier,"supplierContact"=excluded."supplierContact",status=excluded.status,remarks=excluded.remarks,"serialNumber"=excluded."serialNumber","syncToInventory"=excluded."syncToInventory",updated_at=now();

 if p.status='Received' and p."syncToInventory" then

 for i in 1..p.quantity loop

 if not exists(select 1 from public.assets where purchase_record_id=p.id and purchase_unit=i) then

 asset_id:=public.save_asset_record(jsonb_build_object('id',gen_random_uuid(),'name',p.item,'category',p.category,'status','In Stock','assignee','Unassigned','purchase_date',p.date,'specs',jsonb_build_object('purchaseRecordId',p.id,'purchasePrice',p.price,'currency',p.currency,'supplier',p.supplier)::text));

 update public.assets set purchase_record_id=p.id,purchase_unit=i where id=asset_id;

 end if;

 end loop;

 end if;

 return p.id;

end $$;

-- Immutable audit records: actor comes from the verified database session.

create table if not exists public.audit_events(id bigint generated always as identity primary key, actor uuid, table_name text not null, operation text not null, row_id text, before_data jsonb, after_data jsonb, occurred_at timestamptz not null default now());

alter table public.audit_events enable row level security;

grant select on public.audit_events to authenticated;

create policy audit_read on public.audit_events for select to authenticated using(app_private.is_admin());

create or replace function app_private.audit_change() returns trigger language plpgsql security definer set search_path = '' as $$

begin

 insert into public.audit_events(actor,table_name,operation,row_id,before_data,after_data) values(auth.uid(),tg_table_name,tg_op,coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id',to_jsonb(new)->>'uid',to_jsonb(old)->>'uid'),to_jsonb(old)-'value',to_jsonb(new)-'value');

 return coalesce(new,old);

end $$;

do $$ declare t text; begin

 foreach t in array array['assets','asset_assignments','purchases','app_users','role_permissions','password_vault','access_control_register','kpi_metrics'] loop

 execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function app_private.audit_change()',t);

 end loop;

end $$;

revoke all on function app_private.guard_profile(),app_private.audit_change() from public,anon,authenticated;

revoke all on function public.allocate_asset_code(text),public.assign_asset_person(uuid,uuid,date,text),public.return_asset_assignment(uuid,date,text,text),public.save_asset_record(jsonb),public.import_asset_records(jsonb),public.save_purchase_record(jsonb) from public,anon;

grant execute on function public.allocate_asset_code(text),public.assign_asset_person(uuid,uuid,date,text),public.return_asset_assignment(uuid,date,text,text),public.save_asset_record(jsonb),public.import_asset_records(jsonb),public.save_purchase_record(jsonb) to authenticated;

create or replace function public.update_login_display_name(target_uid uuid, new_display_name text) returns jsonb language plpgsql security invoker set search_path = '' as $$

declare result jsonb; begin

 if not app_private.is_admin() then raise exception 'Administrator required'; end if;

 if nullif(trim(new_display_name),'') is null then raise exception 'Name required'; end if;

 update public.app_users set display_name=trim(new_display_name) where uid=target_uid returning to_jsonb(app_users) into result;

 update public.asset_people set full_name=trim(new_display_name) where linked_user_id=target_uid;

 update public.assets a set assignee=trim(new_display_name) from public.asset_assignments aa join public.asset_people p on p.id=aa.asset_person_id where aa.asset_id=a.id and aa.status='Active' and p.linked_user_id=target_uid;

 return result;

end $$;

revoke all on function public.update_login_display_name(uuid,text) from public,anon;

grant execute on function public.update_login_display_name(uuid,text) to authenticated;

-- Remove obsolete public username/email lookup; login is verified by the server instead.

do $$ begin if to_regprocedure('public.get_auth_email_by_username(text)') is not null then execute 'revoke all on function public.get_auth_email_by_username(text) from public,anon,authenticated'; end if; end $$;

alter table public.tickets add column if not exists "actions" jsonb;

alter table public.tickets add column if not exists "assigned_to_name" text;

alter table public.tickets add column if not exists "response_time" numeric;

alter table public.content_plans add column if not exists "productName" text;

alter table public.content_plans add column if not exists "price" text;

alter table public.content_plans add column if not exists "promotionPeriod" text;

alter table public.content_plans add column if not exists "content" text;

alter table public.content_plans add column if not exists "reviewer" text;

alter table public.meeting_minutes add column if not exists "time" text;

alter table public.meeting_minutes add column if not exists "location" text;

alter table public.meeting_minutes add column if not exists "tags" jsonb;

alter table public.meeting_minutes add column if not exists "content" text;

alter table public.meeting_minutes add column if not exists "actionItems" jsonb;

alter table public.meeting_minutes add column if not exists "createdAt" timestamptz;

alter table public.meeting_minutes add column if not exists "createdBy" text;

alter table public.meeting_minutes add column if not exists "createdByEmail" text;

alter table public.renewals add column if not exists "serviceName" text;

alter table public.renewals add column if not exists "shopName" text;

alter table public.renewals add column if not exists "expireDate" text;

alter table public.renewals add column if not exists "currency" text;

alter table public.renewals add column if not exists "billingCycle" text;

alter table public.renewals add column if not exists "provider" text;

alter table public.renewals add column if not exists "renewalMethod" text;

alter table public.renewals add column if not exists "contactPerson" text;

alter table public.renewals add column if not exists "contactPhone" text;

alter table public.renewals add column if not exists "websiteLink" text;

alter table public.renewals add column if not exists "wifiId" text;

alter table public.renewals add column if not exists "mb" text;

alter table public.renewals add column if not exists "ispName" text;

alter table public.renewals add column if not exists "phoneNumber" text;

alter table public.renewals add column if not exists "credentials" text;

alter table public.renewals add column if not exists "location" text;

alter table public.renewals add column if not exists "remarks" text;

alter table public.renewals add column if not exists "price" numeric;

alter table public.renewals add column if not exists "twelveMonthPrice" numeric;

alter table public.renewals add column if not exists "orderIndex" integer;

alter table public.renewals add column if not exists "requiredDocuments" jsonb;

-- Enable only required realtime feeds when the Supabase publication is present.

do $$ declare t text; begin

 if exists(select 1 from pg_publication where pubname='supabase_realtime') then

 foreach t in array array['assets','purchases','renewals','content_plans','backups','cctv_requests','daily_logs','activities','task_evidence','employees','app_users','role_permissions','asset_assignments'] loop

 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;

 end loop; end if;

end $$;

-- Legacy config may still contain passwordNotes: expose only non-secret columns.

revoke select on public.system_config from authenticated;

grant select(id,departments,locations,"itContacts","branchNotes",updated_at) on public.system_config to authenticated;

-- Service-role-only credential mutations preserve the actor and audit in the same transaction.

create or replace function public.server_save_credential(record jsonb, actor uuid) returns uuid language plpgsql security invoker set search_path = '' as $$

declare entry_id uuid := (record->>'id')::uuid; begin

 if current_user <> 'service_role' then raise exception 'Server access required'; end if;

 insert into public.password_vault(id,label,account,branch,value) values(entry_id,record->>'label',record->>'account',record->>'branch',record->>'value')

 on conflict(id) do update set label=excluded.label,account=excluded.account,branch=excluded.branch,value=excluded.value,updated_at=now();

 insert into public.audit_events(actor,table_name,operation,row_id) values(actor,'password_vault','WRITE',entry_id::text);

 return entry_id;

end $$;

create or replace function public.server_delete_credential(entry_id uuid, actor uuid) returns void language plpgsql security invoker set search_path = '' as $$

begin

 if current_user <> 'service_role' then raise exception 'Server access required'; end if;

 delete from public.password_vault where id=entry_id;

 insert into public.audit_events(actor,table_name,operation,row_id) values(actor,'password_vault','DELETE',entry_id::text);

end $$;

revoke all on function public.server_save_credential(jsonb,uuid),public.server_delete_credential(uuid,uuid) from public,anon,authenticated;

grant execute on function public.server_save_credential(jsonb,uuid),public.server_delete_credential(uuid,uuid) to service_role;

grant select,insert,update,delete on public.password_vault to service_role;

grant select,insert on public.audit_events to service_role;

grant usage,select on sequence public.audit_events_id_seq to service_role;

do $$ declare signature text; begin

 foreach signature in array array['public.next_asset_code(text)','public.admin_update_user_display_name(uuid,text)'] loop

 if to_regprocedure(signature) is not null then execute 'revoke all on function '||signature||' from public,anon,authenticated'; end if;

 end loop;

end $$;

-- Preserve rows written by earlier camelCase clients when moving to canonical columns.
do $$ declare t text; begin
 foreach t in array array['daily_logs','weekly_logs','monthly_logs'] loop
 execute format('update public.%I t set user_id=coalesce(user_id,to_jsonb(t)->>''userId''), custom_tasks=case when custom_tasks is null or custom_tasks=''[]''::jsonb then coalesce(to_jsonb(t)->''customTasks'',''[]''::jsonb) else custom_tasks end',t);
 end loop;
end $$;
update public.backups t set system=coalesce(system,to_jsonb(t)->>'storageType'),notes=coalesce(notes,to_jsonb(t)->>'performer');
update public.cctv_requests t set purpose=coalesce(purpose,to_jsonb(t)->>'reason'),date=coalesce(date,nullif(to_jsonb(t)->>'dateOfFootage','')::date),status=coalesce(status,to_jsonb(t)->>'approvalStatus'),reviewer=coalesce(reviewer,to_jsonb(t)->>'approvedBy');
commit;

