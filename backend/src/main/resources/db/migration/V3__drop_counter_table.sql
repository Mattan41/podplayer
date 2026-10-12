-- =============================================================================
-- V3__drop_counter_table.sql
--
-- Drops the walking-skeleton "counter" table. Its frontend page was retired in
-- C.5 (DECISIONS.md entry 21); the controller, entity and repository are
-- removed in the same change (entry 46).
--
-- V1 deliberately did not create this table: it predated Flyway and was
-- absorbed on the live database by baseline-on-migrate. A fresh database
-- therefore never had it, which is why ddl-auto: validate failed in CI with
-- "missing table [counter]". IF EXISTS makes this a no-op on a database
-- created after this change and a single drop on the live one, so both share
-- the same migration history (V1, V2, V3).
-- =============================================================================

DROP TABLE IF EXISTS counter;
