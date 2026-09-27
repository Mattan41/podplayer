# Podplayer Infrastructure

## Purpose

This folder documents how Podplayer is deployed and hosted. It is not code — it is the reference for "what is configured where" so future-you (or anyone else) can understand the setup without opening five different cloud consoles.

## Reference Documents

| Document | Description |
| --- | --- |
| [cloud-run-config.md](./cloud-run-config.md) | Cloud Run backend service: identity, image tags, scaling, env-vars, logs, and custom domain. |
| [dns-records.md](./dns-records.md) | All Cloudflare DNS records for `kruskopf.org`, proxy status, and how to verify them. |
| [secrets.md](./secrets.md) | Where every secret and configuration value lives (never their actual values). |

## High-Level Architecture

```text
                         ┌───────────────────────────┐
                         │           User            │
                         └─────────────┬─────────────┘
                                       │ HTTPS
                                       ▼
                         ┌───────────────────────────┐
                         │  Cloudflare DNS           │
                         │  kruskopf.org (DNS-only)  │
                         └───┬───────────────────┬───┘
        podplayer.kruskopf.org │                   │ podplayer-api.kruskopf.org
                               ▼                   ▼
                  ┌────────────────────┐  ┌────────────────────┐
                  │  GitHub Pages      │  │  Cloud Run         │
                  │  Next.js (static)  │  │  Spring Boot       │
                  └────────────────────┘  └─────────┬──────────┘
                                                    │ JDBC (pooler)
                                                    ▼
                                         ┌────────────────────┐
                                         │  Supabase          │
                                         │  PostgreSQL        │
                                         └────────────────────┘
```

- **Frontend** — Next.js static export (`output: 'export'`) hosted on GitHub Pages at `https://podplayer.kruskopf.org`.
- **Backend** — Spring Boot container on Google Cloud Run at `https://podplayer-api.kruskopf.org`.
- **Database** — Managed PostgreSQL on Supabase, reached over JDBC through a connection pooler.
- **DNS** — Cloudflare, DNS-only (gray cloud) for both subdomains (see [dns-records.md](./dns-records.md)).

## Deployment Flow

A push to `main` triggers GitHub Actions (path-filtered per app):

1. **Frontend** (`frontend/**` changed) → build the Next.js static site (`npm run build`) → deploy the `frontend/out` artifact to GitHub Pages.
2. **Backend** (`backend/**` changed) → build the Docker image → push it to Artifact Registry → deploy the new revision to Cloud Run.

See `.github/workflows/deploy-frontend.yml` and `.github/workflows/deploy-backend.yml` in the repository root for the authoritative pipeline definitions.

## Cost Summary

The full stack runs within free tiers:

| Component | Plan | Cost guard |
| --- | --- | --- |
| GitHub Pages | Free for public repositories | n/a |
| Cloud Run | Free tier (scale-to-zero) | `--max-instances=5` caps worst-case scaling and spend |
| Supabase | Free tier | Single pooled database connection strategy |
| Cloudflare DNS | Free plan | DNS-only records, no paid proxy features |

The `--max-instances=5` flag is the primary cost guard for the backend: Cloud Run scales to zero when idle (`--min-instances=0`) and the instance ceiling bounds both horizontal scale and any accidental runaway billing.

## Links

- **GCP Console (project):** https://console.cloud.google.com/run?project=podplayer-prod
- **GitHub Actions (this repo):** https://github.com/Mattan41/podplayer/actions
- **Cloudflare dashboard:** https://dash.cloudflare.com
