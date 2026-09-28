# Cloud Run Configuration — `podplayer-backend`

Reference for the Cloud Run service that hosts the Spring Boot backend. For the values behind the environment variables, see [secrets.md](./secrets.md).

## Service Identity

| Property | Value |
| --- | --- |
| Service name | `podplayer-backend` |
| GCP project | `podplayer-prod` |
| Project number | `552068024362` |
| Region | `europe-north1` |
| Public URL | `https://podplayer-api.kruskopf.org` |
| Raw Cloud Run URL | `https://podplayer-backend-552068024362.europe-north1.run.app` |

The public URL is a Cloud Run **custom domain mapping**. The raw `*.run.app` URL always works and is useful for debugging when DNS or the custom domain is in question.

## Container Image

| Tag | Purpose |
| --- | --- |
| `europe-north1-docker.pkg.dev/podplayer-prod/podplayer/backend:latest` | Default "most recent" pointer, convenient for manual inspection. |
| `europe-north1-docker.pkg.dev/podplayer-prod/podplayer/backend:<git-sha>` | Immutable tag per commit; used for deploy and rollback. |

**Two-tag strategy:** every build pushes both tags. Cloud Run is always deployed with the immutable `<git-sha>` tag, so a running revision is traceable to an exact commit. `latest` is a moving convenience tag and is never what a revision is pinned to. To roll back, redeploy an earlier `<git-sha>` image.

## Scaling Configuration

| Flag | Value |
| --- | --- |
| `--max-instances` | `5` |
| `--min-instances` | `0` |
| `--memory` | `512Mi` |
| `--cpu` | `1` |
| `--port` | `8080` |

Scale-to-zero (`--min-instances=0`) keeps idle cost at zero; the instance ceiling (`--max-instances=5`) is the primary cost guard and also bounds database connections.

## Environment Variables

Values live in the Cloud Run console (or are managed via the commands below and recorded in [secrets.md](./secrets.md)). Names only:

| Name | Description |
| --- | --- |
| `SPRING_DATASOURCE_URL` | Supabase **Transaction Pooler** JDBC URL, **port `6543`**, with `sslmode=require` and `prepareThreshold=0`. |
| `SPRING_DATASOURCE_USERNAME` | Database user for the Supabase pooler. |
| `SPRING_DATASOURCE_PASSWORD` | Database password for the Supabase pooler. |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed browser origins (e.g. the frontend URL and `http://localhost:3000`). |
| `SUPABASE_JWKS_URI` | Supabase JWKS endpoint, used by NimbusJwtDecoder to verify JWT signatures. Required; the service fails to start without it. See infra/secrets.md. |

Expected shape of the datasource URL (placeholders only — see [secrets.md](./secrets.md) for where the real value lives):

```text
jdbc:postgresql://<project-ref>.pooler.supabase.com:6543/postgres?sslmode=require&prepareThreshold=0
```

### Why Transaction Pooler (port 6543) and not Session Pooler (5432)

The **Session Pooler has a hard limit of 15 clients**, and Cloud Run autoscaling can easily exceed that — each instance opens its own pool. The **Transaction Pooler supports 200+ clients**, so it absorbs autoscaling comfortably.

The Hikari connection pool is capped at **3 connections per instance**, so the worst case is `5 instances × 3 connections = 15`, which stays within the pooler's capacity.

`prepareThreshold=0` disables server-side prepared statements, which the transaction-mode pooler cannot safely share across transactions.

## How to Update Environment Variables

Use `--update-env-vars` to add or change only the named variables:

The current `CORS_ALLOWED_ORIGINS` value (public origin URLs, not secrets) lists all four allowed origins:

```bash
gcloud run services update podplayer-backend \
  --region=europe-north1 \
  --update-env-vars="CORS_ALLOWED_ORIGINS=http://localhost:3000\,https://podplayer.kruskopf.org\,https://podplayer-api.kruskopf.org\,https://podplayer-backend-552068024362.europe-north1.run.app"
```

Notes:

- If a value itself contains a comma, escape it with a backslash: `\,` (as shown above).
- To set several variables at once, `--env-vars-file=backend/env.yaml` is a convenient alternative — that file is gitignored and is recorded in [secrets.md](./secrets.md).
- `--env-vars-file` **replaces all environment variables** on the service with the file contents. Do not use it to change a single value unless the file is complete.

## How to View Logs

```bash
gcloud run services logs read podplayer-backend --region=europe-north1 --limit=50
```

## Custom Domain Mapping

The custom domain is managed with `gcloud beta run domain-mappings`:

```bash
gcloud beta run domain-mappings list --region=europe-north1

gcloud beta run domain-mappings describe \
  --domain=podplayer-api.kruskopf.org \
  --region=europe-north1
```

- The TLS certificate is issued by **Let's Encrypt** and **auto-renewed** by Cloud Run.
- DNS for the domain is handled by **Cloudflare in DNS-only (gray cloud) mode** — Cloudflare must not proxy the traffic or it would terminate TLS itself and break Cloud Run's certificate. See [dns-records.md](./dns-records.md).
