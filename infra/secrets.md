# Secrets & Configuration Locations

**No secrets are committed to this repository. This file documents where secrets live, not their values.**

Never paste a real value into this file, an issue, a commit, or a chat. If you need the value, read it in the location listed below.

## Secrets and Configuration

| Secret / Config | Storage | Consumed by | Rotation procedure |
| --- | --- | --- | --- |
| `SPRING_DATASOURCE_URL` | Cloud Run env-vars | Backend runtime | `gcloud run services update ... --update-env-vars` |
| `SPRING_DATASOURCE_USERNAME` | Cloud Run env-vars | Backend runtime | Same |
| `SPRING_DATASOURCE_PASSWORD` | Cloud Run env-vars (TODO: migrate to Secret Manager) | Backend runtime | Reset in the Supabase dashboard, then update Cloud Run |
| `CORS_ALLOWED_ORIGINS` | Cloud Run env-vars | Backend runtime | Same |
| `SUPABASE_JWKS_URI` | Cloud Run env-vars | Backend runtime (`NimbusJwtDecoder`) | Same |
| `env.yaml` (Cloud Run bulk env-vars) | `backend/env.yaml` (gitignored) | Local `gcloud run services update --env-vars-file` | Edit the file, then run `gcloud run services update ... --env-vars-file=env.yaml` |
| `GCP_PROJECT_ID` | GitHub Secrets | Backend deploy workflow | Rotate in the GitHub repository settings |
| `GCP_SERVICE_ACCOUNT` | GitHub Secrets | Backend deploy workflow | Same |
| `WORKLOAD_IDENTITY_PROVIDER` | GitHub Secrets | Backend deploy workflow | Same |
| `SUPABASE_ANON_KEY` | GitHub Secrets | Frontend deploy workflow | Rotate in the Supabase dashboard, then update the GitHub secret |
| Local Supabase creds | `backend/.env` (gitignored) | Local development only | Same values as Cloud Run |
| `NEXT_PUBLIC_SUPABASE_URL` | `frontend/.env.local` (gitignored) / frontend build env | Frontend build — public, not a secret | Same value as the Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `frontend/.env.local` (gitignored) / frontend build env | Frontend build — public, not a secret | Rotate in the Supabase dashboard |


The Cloud Run env-var commands are documented in [cloud-run-config.md](./cloud-run-config.md). The GitHub Secrets are referenced by `.github/workflows/deploy-backend.yml`.

## Workload Identity Federation

GitHub Actions authenticates to Google Cloud using **Workload Identity Federation**, so there are no long-lived JSON service-account keys to store or leak. Each workflow run requests a short-lived OIDC token, which GCP verifies against a Workload Identity Pool. The pool's provider carries an **attribute condition restricting access to the `Mattan41/podplayer` repository only**, so tokens from any other repository are rejected.

## Planned Improvement

> **Migrate `SPRING_DATASOURCE_PASSWORD` (and eventually all datasource values) to GCP Secret Manager**, referenced via `--set-secrets` in the deploy workflow. This removes the secret from Cloud Run's plain-text env-vars and gives it a dedicated storage, access-control, and rotation surface.

## Local Development

Local development mirrors production values but keeps them off version control:

- `backend/.env` holds the same datasource and CORS values used by the backend locally (Spring reads it for local runs).
- `frontend/.env.local` holds `NEXT_PUBLIC_API_URL`, which is **public, not a secret** — it is baked into the static build and is visible to every browser.
- Both files are **gitignored**. Their shape is documented by the committed `.env.example` files (`backend/.env.example` and `frontend/.env.example`).
- `backend/env.yaml` is a bulk env-vars file used with `gcloud run services update --env-vars-file`. It is **gitignored** (`backend/.gitignore`) and is never committed, so treat it as a local-only copy of the Cloud Run env-vars.

To set up locally, copy the example file and fill in the values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

## Manual Steps After First Deploy

These steps are performed **manually** against the Supabase project. They are deliberately not automated because they contain or depend on a personal e-mail address, which must not enter Git history. Perform them once per fresh Supabase project — for new-developer onboarding or after a disaster-recovery rebuild.

### 1. Enable Row Level Security

Flyway creates `allowed_users`, `counter`, and `flyway_schema_history` in the `public` schema. Supabase exposes `public` through PostgREST, so enable Row Level Security on all three:

```sql
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE flyway_schema_history ENABLE ROW LEVEL SECURITY;
```

Then add a deny-all policy for the `anon` and `authenticated` roles that PostgREST uses. The backend is unaffected: it connects over JDBC as the `postgres` role, which bypasses RLS.

```sql
CREATE POLICY "Deny anon access" ON allowed_users
    FOR ALL TO anon, authenticated
    USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon access" ON counter
    FOR ALL TO anon, authenticated
    USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon access" ON flyway_schema_history
    FOR ALL TO anon, authenticated
    USING (false) WITH CHECK (false);
```

> **Required before the frontend anon key is deployed.** The anon key is public — it is shipped to every browser. RLS is the only thing preventing unauthorised reads through PostgREST.

### 2. Insert the First Administrator

The allowlist starts empty and `/api/admin/users` requires an existing admin, so the first administrator can only be bootstrapped here:

```sql
INSERT INTO allowed_users (email, role, note, created_by)
VALUES ('<your-email>', 'ADMIN', 'Owner', 'bootstrap');
```

Replace `<your-email>` with the real Google account address that will sign in via Supabase Auth. Use the same address Supabase places in the JWT `email` claim — the backend normalises it by trimming and lower-casing.

### 3. Configure Supabase Auth URL Settings

In the Supabase dashboard, under **Authentication → URL Configuration**:

| Setting | Value |
| --- | --- |
| Site URL | Production frontend URL, e.g. `https://podplayer.kruskopf.org` |
| Redirect URLs | Both `https://podplayer.kruskopf.org` and `http://localhost:3000` |

### 4. Verify

All three tables must report `relrowsecurity = t`:

```sql
SELECT relname, relrowsecurity FROM pg_class
WHERE relname IN ('allowed_users', 'counter', 'flyway_schema_history');
```

The administrator row must be present:

```sql
SELECT email, role FROM allowed_users;
```
