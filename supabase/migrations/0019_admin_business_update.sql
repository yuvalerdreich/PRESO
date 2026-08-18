-- Admins can suspend a business — a second correction to 0010_rls.sql.
--
-- §4.1's CRUD table has a row for it: "U | admin | SA suspendBusiness | status = SUSPENDED;
-- writes audit_log". But `businesses_update` was written as
-- `using (is_owner_of(id) or is_employee_of(id))` with no `is_admin()` clause, so an admin's
-- UPDATE matched **zero rows**.
--
-- The failure mode is the reason this went unnoticed and the reason it matters: an UPDATE that
-- RLS filters to zero rows is not an error. PostgREST returns success, the action returns
-- `{ ok: true }`, and nothing happens. The suspension silently did not take effect, and the only
-- visible symptom was a missing audit_log row.
--
-- `profiles_update` already had `or is_admin()` (that is how `suspendUser` works), so this is
-- restoring a symmetry that was always intended rather than granting a new power. The audit
-- trigger on the status column (0009_triggers.sql) needs no change — it starts firing for admins
-- as soon as their update actually matches a row.
drop policy if exists businesses_update on businesses;

create policy businesses_update on businesses for update
  using (is_owner_of(id) or is_employee_of(id) or is_admin())
  with check (is_owner_of(id) or is_employee_of(id) or is_admin());
