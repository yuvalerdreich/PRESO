-- claim_business_account_type() — TECHNICAL_DESIGN.md §12.34. Google SSO sign-in has no way
-- to pass the CLIENT/BUSINESS choice before handle_new_user() (0009) inserts the profiles
-- row, so every OAuth-created profile lands as CLIENT (the trigger's existing fallback).
-- profiles.account_type is otherwise immutable by the user themselves (0010's RLS: "own row
-- (not account_type, not status)"), so a security definer RPC is the only legal write path
-- for the one-time upgrade offered on the post-OAuth /signup/choose-role screen.
create or replace function claim_business_account_type()
returns profiles
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_profile profiles%rowtype;
begin
  -- Transaction-local escape hatch for 0010's protect_profile_privileged_columns() trigger —
  -- security definer bypasses RLS but not triggers, and that trigger otherwise makes
  -- account_type unconditionally immutable for the 'authenticated' role. See the comment
  -- there for the full reasoning.
  perform set_config('app.claim_business_account_type', 'true', true);

  update profiles
     set account_type = 'BUSINESS'
   where id = auth.uid()
     and account_type = 'CLIENT'
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'not_found' using errcode = '23503';
  end if;

  return v_profile;
end;
$$;
