-- =============================================================================
-- V1__create_allowed_users.sql
--
-- Creates the allowlist table for authenticated users. No seed row is
-- included: the first administrator is inserted manually after deployment.
--
-- See docs or infra notes for the manual INSERT command.
--
-- NOTE ON BASELINING:
--   The pre-existing "counter" table is absorbed by
--   spring.flyway.baseline-on-migrate=true / baseline-version=0, so this file
--   does NOT (and must not) re-create it. No V0 migration exists by design.
-- =============================================================================

CREATE TABLE allowed_users (
    email       TEXT PRIMARY KEY,
    role        TEXT NOT NULL DEFAULT 'USER',
    note        TEXT,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by  TEXT,
    CONSTRAINT allowed_users_role_check CHECK (role IN ('USER', 'ADMIN'))
);
