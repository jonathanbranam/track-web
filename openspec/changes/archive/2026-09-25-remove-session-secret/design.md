## Context

`src/env.ts` builds the `env` object that the rest of the server imports. Only one entry is mandatory: `SESSION_SECRET: requireEnv('SESSION_SECRET')`. `requireEnv` logs the missing key and calls `process.exit(1)`. The entry carries a comment admitting it is "retained … for compatibility; no longer used". No file reads `env.SESSION_SECRET`. The session code (`src/utils/session.ts`, `session.repository.ts`) mints a random 32-byte token and stores its SHA-256 hash, so it has nothing to sign.

Every other variable already has a default (`PORT`, `SQLITE_PATH`) or is optional (`DEPLOY_SECRET`, `TMDB_API_KEY`). `TMDB_PERSON_SORT` is read directly from `process.env` in `src/utils/tmdb.ts`. No test checks the exit-on-missing behaviour. `vitest.config.mts` injects `SESSION_SECRET: 'test-secret'` only so that importing `env.ts` doesn't kill the test process.

## Goals / Non-Goals

**Goals:**
- The server starts with no `.env`.
- Nothing in the repo tells anyone to generate or set `SESSION_SECRET`.
- `.env.example` matches what the server actually reads.

**Non-Goals:**
- Any change to how sessions or API tokens work.
- Moving `TMDB_PERSON_SORT` into `env.ts`. It's read per call on purpose; this change only documents it in `.env.example`.
- Removing `SESSION_SECRET` from the production `.env`. It's harmless and can be deleted by hand at any time.
- Editing archived changes under `openspec/changes/archive/`. They are history.

## Decisions

- **Delete `requireEnv` instead of keeping it for later.** With `SESSION_SECRET` gone it has no callers. Re-adding four lines is trivial if a truly required variable ever appears, and dead code keeps suggesting that something here must be set. Alternative: keep it with a comment. Rejected, because that's the same misleading residue this change is removing.
- **`.env.example` lists optional variables commented out**, each with a one-line note, and keeps `PORT`/`SQLITE_PATH` as active placeholders with their defaults. `cp .env.example .env` then gives a working file without accidentally setting an empty `DEPLOY_SECRET`/`TMDB_API_KEY`. `env.ts` treats an empty string differently from an unset one only for `TMDB_PERSON_SORT`, and that falls back to `decay` for any unknown value.
- **Specs.** A MODIFIED requirement must keep every scenario name the current spec has, because OpenSpec matches scenarios by name and has no syntax for deleting one (validate and archive both refuse). Keeping "Application exits on missing required vars" over a body saying it doesn't exit would archive a contradiction, so both affected requirements are replaced instead. A REMOVED and ADDED pair can't share a name, so each replacement is renamed. deployment's "Environment variable configuration" is REMOVED and ADDED back as "Environment configuration with no required variables", with scenarios for documented variables, starting with none set, ignoring unused ones, and optional features degrading. user-auth's "Password stored as bcrypt hash with salt" is REMOVED and ADDED back as "Passwords stored as bcrypt hashes; no auth secrets in the environment".

## Risks / Trade-offs

- **Some external script or tooling might pass or expect `SESSION_SECRET`** → it gets ignored and nothing fails. A process manager config that sets it (e.g. pm2 `env_file`) keeps working.
- **Losing fail-fast startup validation** → nothing currently needs it. If a required variable comes back, reintroduce the check with it.
