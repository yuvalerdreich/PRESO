-- businesses.booking_notes, and a business photo that can be set when the business is opened
-- (TECHNICAL_DESIGN.md §12.53).
--
-- Both come from building `/businesses/manage/details`, the settings screen. Its design has five
-- groups, and two of them had no write path:
--
--  * "מדיניות קביעת תורים והגעה" — how far ahead clients may book, when to arrive. Operational
--    prose, exactly the class §12.44 settled `payment_notes` into: nothing branches on it, so
--    nothing types it. Same nullable text, same 1000-char bound as `description`/`payment_notes`.
--
--  * The business photo. The column already exists — `photo_paths text[]` (0003) — and
--    `resolvePhotoUrl()` already reads it, but nothing in the app ever wrote it: photos existed
--    only in the seed. The settings screen writes it, and so does the create wizard, which is why
--    `create_business_with_owner` grows a parameter rather than the app following the RPC with a
--    second UPDATE (that would leave a brand-new business photoless whenever the second statement
--    fails, and §6.8 rule 3's whole point is that opening a business is one transaction).
--
-- The array stays an array — a gallery is the obvious next step and `photo_paths`' own CHECK
-- already allows up to 8 — so one photo is `array[url]`, not a new scalar column.

alter table businesses
  add column booking_notes text null
    check (booking_notes is null or length(btrim(booking_notes)) <= 1000);

comment on column businesses.booking_notes is
  'Free-text booking/arrival note shown to clients (§12.53). Operational prose only — no code '
  'branches on it, unlike cancellation_window_hours and approval_policy.';

-- ============================================================================
-- create_business_with_owner — re-created to carry booking_notes and the photo
-- ============================================================================
-- Same reason 0020 dropped before recreating: Postgres identifies a function by name *and*
-- argument types, so `create or replace` with extra parameters would leave the 11-argument
-- version in place and PostgREST would have two candidates to resolve against.
drop function if exists create_business_with_owner(
  text, uuid, text, text, text, text, text, approval_policy, int, text, text
);

-- Body is 0020's verbatim, plus p_booking_notes and p_photo_url — see 0017_fn_roster.sql for why
-- this is an RPC at all (§6.8 rule 3: the business and its first employee are one transaction or
-- neither).
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
