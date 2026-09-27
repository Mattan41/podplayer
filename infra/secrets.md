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
| `env.yaml` (Cloud Run bulk env-vars) | `backend/env.yaml` (gitignored) | Local `gcloud run services update --env-vars-file` | Edit the file, then run `gcloud run services update ... --env-vars-file=env.yaml` |
| `GCP_PROJECT_ID` | GitHub Secrets | Backend deploy workflow | Rotate in the GitHub repository settings |
| `GCP_SERVICE_ACCOUNT` | GitHub Secrets | Backend deploy workflow | Same |
| `WORKLOAD_IDENTITY_PROVIDER` | GitHub Secrets | Backend deploy workflow | Same |
| Local Supabase creds | `backend/.env` (gitignored) | Local development only | Same values as Cloud Run |


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
