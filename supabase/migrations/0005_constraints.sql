-- The no-double-booking guarantee (TECHNICAL_DESIGN.md §3.9, §6.2). One employee cannot
-- hold two overlapping live appointments; different employees may hold the same slot.
-- Requires btree_gist (0001_extensions.sql) for the uuid equality operator class in a
-- GiST index.
--
-- This is the whole guarantee. Nothing in application code duplicates it — book_appointment()
-- (0007_fn_booking.sql) re-checks availability before inserting, but it is this constraint,
-- decided at COMMIT, that actually rules on a race. The loser's COMMIT raises SQLSTATE
-- 23P01, which the route handler maps to HTTP 409 (TECHNICAL_DESIGN.md §8.2).
alter table appointments add constraint appointments_no_overlap
  exclude using gist (
    employee_id with =,
    slot        with &&
  ) where (status <> 'CANCELLED');
