-- =============================================================================
-- infra/db-bootstrap.sql
--
-- Manual database setup for a fresh Supabase project.
--
-- Run this ONCE per project, AFTER the backend has started successfully at
-- least one time. The backend runs Flyway on startup, which applies
-- V1__create_allowed_users.sql and V2__create_podcast_tables.sql. Those
-- migrations create the tables. This file covers the two steps that Flyway
-- must not do:
--
--   1. Row Level Security. Supabase exposes the public schema through
--      PostgREST, and the anon key is shipped to every browser. Without
--      RLS, every table is readable by anyone who has the key.
--
--   2. The initial administrator. The allowlist starts empty and
--      /api/admin/users requires an existing admin, so the first row can
--      only be inserted here.
--
-- Both steps contain or depend on personal data (an e-mail address) that
-- must not enter Git history.
--
-- See infra/secrets.md for the context of each step, and
-- infra/README.md for how the pieces fit together.
-- =============================================================================


-- =============================================================================
-- 1. Enable Row Level Security
-- =============================================================================
--
-- Seven tables are in the public schema. allowed_users and the four
-- podcast tables (podcast, episode, subscription, playback_state) are
-- created by Flyway migrations V1 and V2. counter pre-existed and is
-- absorbed by spring.flyway.baseline-on-migrate. flyway_schema_history
-- is Flyway's own bookkeeping table.
--
-- The backend connects over JDBC as the postgres role, which bypasses
-- RLS. The deny-all policy below therefore does not affect it.

ALTER TABLE allowed_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter               ENABLE ROW LEVEL SECURITY;
ALTER TABLE flyway_schema_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast               ENABLE ROW LEVEL SECURITY;
ALTER TABLE episode               ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription          ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_state        ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 2. Deny all PostgREST access
-- =============================================================================
--
-- One policy per table, applying to the two roles PostgREST uses. The
-- policy denies every operation, so the anon key can neither read nor
-- write any of these tables.

CREATE POLICY "Deny anon access" ON allowed_users
    FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon access" ON counter
    FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon access" ON flyway_schema_history
    FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon access" ON podcast
    FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon access" ON episode
    FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon access" ON subscription
    FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon access" ON playback_state
    FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);


-- =============================================================================
-- 3. Insert the first administrator
-- =============================================================================
--
-- Replace <your-email> with the real Google account address that will sign
-- in via Supabase Auth. Use the same address Supabase places in the JWT
-- email claim. The backend normalises it (trim + lowercase), so casing
-- here does not matter, but the address must be exact.
--
-- Only one row is needed. Additional users are added through the admin UI
-- once you are signed in.
--
-- Uncomment and edit before running:

-- INSERT INTO allowed_users (email, role, note, created_by)
-- VALUES ('<your-email>', 'ADMIN', 'Owner', 'bootstrap');


-- =============================================================================
-- 4. Verify
-- =============================================================================
--
-- All seven tables must report relrowsecurity = t.

SELECT n.nspname AS schema, c.relname, c.relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname IN (
        'allowed_users',
        'counter',
        'flyway_schema_history',
        'podcast',
        'episode',
        'subscription',
        'playback_state'
      )
ORDER BY n.nspname, c.relname;

-- The administrator row must be present once step 3 has been run.
-- SELECT email, role FROM allowed_users;