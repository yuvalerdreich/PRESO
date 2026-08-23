-- Resend is being removed in favour of an in-app notification bell (§12.x — see
-- TECHNICAL_DESIGN.md). The bell needs a fourth event type that doesn't exist yet: a reminder
-- sent some time before an upcoming appointment. Adding the enum value on its own, in its own
-- migration/transaction, because Postgres forbids using a freshly added enum value in the same
-- transaction that added it — 0031_appointment_reminders.sql (which inserts rows carrying this
-- value) has to run afterward, as a separate transaction.

alter type notification_type add value if not exists 'APPOINTMENT_REMINDER';
