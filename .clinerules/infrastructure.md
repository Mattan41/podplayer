# Infrastructure, Configuration and Secrets

- Do not hardcode credentials.
- Env files are per app: `backend/.env` (Spring) and `frontend/.env.local`
  (Next). Never commit real values.
- Spring config: no default values in `application.yaml` for datasource
  properties; env vars are mandatory.
- GitHub Actions: every `uses:` is pinned to a full 40-character commit SHA with
  a `# vX.Y.Z` comment, never a floating tag such as `@v4`.
