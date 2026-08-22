-- Admins can open a business — a third correction to 0010_rls.sql, same shape as 0019's fix for
-- businesses_update.
--
-- §5 / §12.63: an ADMIN account carries every BUSINESS-portal permission in addition to the admin
-- console — it is a superset role, not a separate lane. `proxy.ts` and `(business)/layout.tsx`
-- already admit `account_type IN ('BUSINESS','ADMIN')` for `/businesses` and `/onboarding`, so an
-- admin can reach the "open a business" wizard — but both layers underneath it still hard-checked
-- `account_type = 'BUSINESS'` alone:
--
--  * `businesses_insert` (0010_rls.sql) — the RLS policy `create_business_with_owner()` bypasses
--    as `security definer`, kept as the second enforcement layer per this repo's own rule that RLS
--    backs every write path even when the primary path is an RPC.
--  * `create_business_with_owner()` (0017, re-created by 0020 and 0024) — the actual check that
--    fires, since PostgREST calls the RPC directly and RLS never runs underneath a
--    `security definer` function.
--
-- Both mirrored each other on the *old*, narrower rule (§12.63 postdates 0017); now both mirror
-- the *current* one. `claim_business_account_type()` (0012) is unaffected — ADMIN is still never
-- reachable through it, and still never self-service (§6.8 rules 1-2).
drop policy if exists businesses_insert on businesses;

create policy businesses_insert on businesses for insert
  with check (
    owner_profile_id = auth.uid()
    and exists (
      select 1 from profiles
       where id = auth.uid()
         and account_type in ('BUSINESS', 'ADMIN')
    )
  );

drop function if exists create_business_with_owner(
  text, uuid, text, text, text, text, text, approval_policy, int, text, text, text, text
);

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
  p_payment_notes             text default null,
  p_booking_notes             text default null,
  p_photo_url                 text default null
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

  -- Mirrors the businesses_insert RLS policy this function bypasses: an ACTIVE BUSINESS or ADMIN
  -- account may open a business (§5, §12.63). A CLIENT upgrades through
  -- claim_business_account_type() first.
  if v_profile.id is null
     or v_profile.status <> 'ACTIVE'
     or v_profile.account_type not in ('BUSINESS', 'ADMIN')
  then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  insert into businesses (
    owner_profile_id, name, description, category_id, address, area, phone,
    timezone, approval_policy, cancellation_window_hours, payment_notes, booking_notes,
    photo_paths
  ) values (
    v_actor, p_name, p_description, p_category_id, p_address, p_area, p_phone,
    p_timezone, p_approval_policy, p_cancellation_window_hours, p_payment_notes, p_booking_notes,
    case
      when p_photo_url is null or btrim(p_photo_url) = '' then '{}'::text[]
      else array[btrim(p_photo_url)]
    end
  )
  returning * into v_business;

  -- The creator becomes employee #1, in this same transaction. If either statement fails the
  -- whole thing rolls back and no half-built business survives.
  insert into employees (business_id, profile_id, position_title, status)
  values (v_business.id, v_actor, p_position_title, 'ACTIVE');

  return v_business;
end;
$$;
