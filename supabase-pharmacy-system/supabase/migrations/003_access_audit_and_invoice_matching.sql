-- Automatically preserve an immutable access-request timeline.
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

drop trigger if exists access_request_audit_on_create on public.access_requests;
create trigger access_request_audit_on_create
  after insert on public.access_requests
  for each row execute procedure public.record_access_request_audit();

drop trigger if exists access_request_audit_on_status_change on public.access_requests;
create trigger access_request_audit_on_status_change
  after update of status on public.access_requests
  for each row execute procedure public.record_access_request_audit();

-- The match value is server-calculated, never trusted from a browser form.
create or replace function public.evaluate_invoice_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if abs(new.invoice_amount - new.po_amount) < 0.01
    and abs(new.invoice_amount - new.received_amount) < 0.01 then
    new.matched := true;
    new.mismatch_reason := null;
  else
    new.matched := false;
    new.mismatch_reason := 'The purchase order, goods receipt, and invoice amounts do not reconcile.';
  end if;
  return new;
end;
$$;

drop trigger if exists invoice_match_evaluation on public.invoice_matches;
create trigger invoice_match_evaluation
  before insert or update of invoice_amount, po_amount, received_amount
  on public.invoice_matches
  for each row execute procedure public.evaluate_invoice_match();
