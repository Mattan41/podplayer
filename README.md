# Podplayer

A disciplined, cross-device podcast player. **Work in progress** – the
infrastructure, auth and access control are in place; playback is in place,
and cross-device resume and the PWA are next.

## Tech Stack

- Frontend: Next.js 16 (static export) · TypeScript · Tailwind CSS 4 · GitHub Pages
- Backend: Spring Boot 4 · Java 25 · Cloud Run
- Database and auth: Supabase (PostgreSQL) · Google OAuth · email allowlist

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) – goals, stack, principles, roadmap
- [frontend/](frontend/README.md) – the Next.js client and how to run it
- [infra/](infra/README.md) – how it is deployed and hosted