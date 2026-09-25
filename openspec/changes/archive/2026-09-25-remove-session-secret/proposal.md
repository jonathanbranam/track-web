## Why

`SESSION_SECRET` is required at startup but nothing uses it. Sessions became opaque random tokens looked up by SHA-256 hash in the `sessions` table, and since then nothing signs with a secret. The only reference left is the `requireEnv('SESSION_SECRET')` check in `src/env.ts`. It forces every environment to invent a meaningless value: production `.env`, tests, and the agent second-instance recipe. It also misleads readers into thinking the value protects sessions. The specs are stale too: `deployment` still says `.env.example` lists `EMAIL` and `PASSWORD_HASH`, which were removed from the file.

## What Changes

- Remove `SESSION_SECRET` from `src/env.ts`, along with the now-unused `requireEnv` helper. The server then has **no required environment variables**: every variable has a default or is optional, so it starts with no `.env` at all.
- Remove the `SESSION_SECRET` test injection from `vitest.config.mts`.
- `.env.example` lists every variable the server reads (`PORT`, `SQLITE_PATH`, `DEPLOY_SECRET`, `TMDB_API_KEY`, `TMDB_PERSON_SORT`), marks the optional ones, and drops `SESSION_SECRET`.
- Update the docs that set or describe it: `README.md`, `CLAUDE.md`, `setup.md`, `docs/dev-second-instance.md`, and `docs/arch/track-web-architecture.md`.
- A `SESSION_SECRET` left in an existing `.env` (production included) is ignored. Deploying needs no coordination and nothing breaks.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `user-auth`: the "Password stored as bcrypt hash with salt" requirement is replaced by "Passwords stored as bcrypt hashes; no auth secrets in the environment". The bcrypt rules are unchanged; the "Startup rejects missing env vars" scenario, which used `SESSION_SECRET` as its example, becomes "startup needs no auth-related environment variables".
- `deployment`: the "Environment variable configuration" requirement is replaced by "Environment configuration with no required variables". `.env.example` lists the variables the server actually reads (no `EMAIL`, `PASSWORD_HASH` or `SESSION_SECRET`), and the server has no required variables and starts on defaults. The "Application exits on missing required vars" scenario is dropped, which OpenSpec only allows by replacing the requirement.

## Impact

- **Code:** `src/env.ts`, `vitest.config.mts`. No routes, schema or client changes. Session behaviour is unchanged.
- **Config:** `.env.example`. Existing `.env` files keep working, and the stale key can be deleted whenever convenient.
- **Docs:** `README.md`, `CLAUDE.md`, `setup.md`, `docs/dev-second-instance.md`, `docs/arch/track-web-architecture.md`.
- **Other changes:** `orbital-dodger-levels` is in progress but touches different capabilities, so there's no conflict when archiving.
