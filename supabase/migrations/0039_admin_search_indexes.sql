-- Trigram indexes for the admin users search (server-side as of this migration — see
-- src/server/queries/admin.ts's listUsers()). Same pattern as businesses_name_trgm
-- (0004_indexes.sql): pg_trgm is already enabled (0001_extensions.sql).
create index profiles_full_name_trgm on profiles using gin (full_name gin_trgm_ops);
create index profiles_phone_trgm     on profiles using gin (phone gin_trgm_ops);
