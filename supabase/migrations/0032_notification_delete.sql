-- Requested change: the notification bell now lets a user dismiss a notification outright —
-- clicking one, or an explicit "x" on the row — instead of only ever marking it read and leaving
-- it in the list forever. 0010_rls.sql deliberately shipped with no DELETE policy ("retention has
-- no purge job in the MVP, §12.16") — that was about server-side pruning, not user-initiated
-- deletion, and this migration only adds the latter. Mirrors notifications_update's own-row-or-
-- admin shape.
create policy notifications_delete on notifications for delete
  using (profile_id = auth.uid() or is_admin());

grant delete on notifications to authenticated;
