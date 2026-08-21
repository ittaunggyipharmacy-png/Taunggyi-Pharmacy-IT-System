-- Add a distinct approval stage between IT review and provisioning.
alter type public.access_request_status add value if not exists 'approved' before 'provisioning';

alter table public.access_request_audits
  drop constraint if exists access_request_audits_action_check;

alter table public.access_request_audits
  add constraint access_request_audits_action_check
  check (action in ('submitted', 'reviewed', 'approved', 'rejected', 'provisioned', 'revoked'));

create or replace function public.record_access_request_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_action text;
begin
  if tg_op = 'INSERT' then
    insert into public.access_request_audits (
      access_request_id, action, from_status, to_status, actor_id, comment
    ) values (
      new.id, 'submitted', null, new.status, new.requester_id, 'Request submitted'
    );
    return new;
  end if;

  if old.status is distinct from new.status then
    audit_action := case new.status
      when 'approved' then 'approved'
      when 'provisioning' then 'provisioned'
      when 'active' then 'provisioned'
      when 'revoked' then 'revoked'
      when 'rejected' then 'rejected'
      else 'reviewed'
    end;
    insert into public.access_request_audits (
      access_request_id, action, from_status, to_status, actor_id, comment
    ) values (
      new.id, audit_action, old.status, new.status, auth.uid(), null
    );
  end if;
  return new;
end;
$$;
