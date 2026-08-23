-- Requested change: a business owner can delete their business outright (0034 adds the RPC).
-- The employees left behind need to be told, and none of the 9 existing notification_type
-- values fit. Adding the enum value on its own, in its own migration/transaction, for the same
-- reason 0030/0031 were split: Postgres forbids using a freshly added enum value in the
-- transaction that added it.

alter type notification_type add value if not exists 'BUSINESS_DELETED';
