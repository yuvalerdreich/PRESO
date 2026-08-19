-- businesses.payment_notes — the free-text half of the policy step (TECHNICAL_DESIGN.md §12.44).
--
-- `copy.createBusiness.policiesStep` has read "מדיניות ביטולים, תורים והערות תשלום" since the
-- create wizard was built, but the step only ever rendered the two typed policy fields
-- (`cancellation_window_hours` and `approval_policy`) — there was no column for the payment note
-- the heading promised. Same situation §12.4 and §12.38's display columns were in: add the column
-- or delete the heading. §12.39's rule decides it — a field that writes nowhere doesn't ship, so
-- the column comes first and the input goes in behind it.
--
-- Deliberately untyped text, unlike §12.2's `cancellation_window_hours`: this is "cash or Bit,
-- payment at the end of the appointment", operational prose the business tells its clients, not
-- something any code branches on. Nothing in `book_appointment()` or the availability engine reads
-- it.
--
-- Nullable with no default and the same 1000-char bound as `businesses.description` (§12.4), so
-- every existing row stays valid and a business that never fills it in renders nothing rather
-- than "null".
alter table businesses
  add column payment_notes text null
    check (payment_notes is null or length(btrim(payment_notes)) <= 1000);

comment on column businesses.payment_notes is
  'Free-text payment/billing note shown to clients (§12.44). Operational prose only — no code '
  'branches on it, unlike cancellation_window_hours and approval_policy.';

-- ============================================================================
-- create_business_with_owner — re-created to carry the new column
-- ============================================================================
-- `create or replace` cannot add a parameter: Postgres identifies a function by name *and*
-- argument types, so replacing with an extra argument would leave the 10-argument version in
-- place and PostgREST would then have two candidates to resolve `create_business_with_owner`
-- against. Drop the old signature explicitly, then recreate.
drop function if exists create_business_with_owner(
  text, uuid, text, text, text, text, text, approval_policy, int, text
);

-- Body is 0017_fn_roster.sql's verbatim, plus p_payment_notes — see that file for why this is an
-- RPC at all (§6.8 rule 3: the business and its first employee are one transaction or neither).
create or replace function create_business_with_owner(
  p_name                      text,
  p_category_id               uuid,
  p_address                   text,
  p_area                      text,
  p_phone                     text,
  p_description               text default null,
  p_timezone                  text default 'Asia/Jerusalem',
  p_approval_policy           approval_policy default 'AUTO',
  p_cancellation_window_hours int default 24,
  p_position_title            text default 'Owner',
  p_payment_notes             text default null
) returns businesses
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor   uuid := auth.uid();
  v_profile profiles%rowtype;
  v_business businesses%rowtype;
begin
  if v_actor is null then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_profile from profiles where id = v_actor;

  -- Mirrors the businesses_insert RLS policy this function bypasses: only an ACTIVE BUSINESS
  -- account may open a business. A CLIENT upgrades through claim_business_account_type() first.
  if v_profile.id is null
     or v_profile.status <> 'ACTIVE'
     or v_profile.account_type <> 'BUSINESS'
  then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  insert into businesses (
    owner_profile_id, name, description, category_id, address, area, phone,
    timezone, approval_policy, cancellation_window_hours, payment_notes
  ) values (
    v_actor, p_name, p_description, p_category_id, p_address, p_area, p_phone,
    p_timezone, p_approval_policy, p_cancellation_window_hours, p_payment_notes
  )
  returning * into v_business;

  -- The creator becomes employee #1, in this same transaction. If either statement fails the
  -- whole thing rolls back and no half-built business survives.
  insert into employees (business_id, profile_id, position_title, status)
  values (v_business.id, v_actor, p_position_title, 'ACTIVE');

  return v_business;
end;
$$;
