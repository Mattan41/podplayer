# API — Health

Base path `/health`. Implemented by `HealthController`, which has no
dependencies.

## Authentication

None. `/health` is outside `/api/**`, and `SecurityConfig` permits any path that
is not under `/api/**` through its existing `anyRequest().permitAll()` rule. No
security annotation is declared on the controller.

## `GET /health` — liveness

Returns a constant body confirming that the application context is serving. It
performs no database access and reports no dependencies: it is not a readiness
probe and does not claim that Supabase is reachable.

**Request.** No parameters, no body.

**Response.** `200 OK`

```json
{ "status": "ok" }
```

## Purpose

Cloud Run runs with `--min-instances=0`, so the first request after idle can
block for 20+ seconds while the container and the JVM cold-start. The frontend
fires one request to this endpoint on mount; it is the cheapest way to bring the
instance up before the user triggers a real call. The endpoint answers in
milliseconds once the instance is warm. See `docs/DECISIONS.md` entry 20 for the
decision and the alternatives that were rejected (notably Spring Boot Actuator).
