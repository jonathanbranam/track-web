## 1. Code

- [x] 1.1 In `src/env.ts`, remove the `SESSION_SECRET` entry and its comment, and delete the now-unused `requireEnv` helper
- [x] 1.2 In `vitest.config.mts`, remove the `env: { SESSION_SECRET: 'test-secret' }` block
- [x] 1.3 Confirm nothing else references it: `grep -rn SESSION_SECRET src scripts packages client-*/src vitest*.mts` returns nothing

## 2. Config

- [x] 2.1 Rewrite `.env.example`: keep `PORT` and `SQLITE_PATH` with their defaults; add commented-out, optional `DEPLOY_SECRET`, `TMDB_API_KEY`, and `TMDB_PERSON_SORT` with one-line notes; drop `SESSION_SECRET`

## 3. Docs

- [x] 3.1 `README.md`: remove the `SESSION_SECRET` row from the Configuration table, and change setup step 2's "fill in SESSION_SECRET" to note that `.env` is optional
- [x] 3.2 `CLAUDE.md`: drop "(`SESSION_SECRET` is required but unused)" from the `env.ts` line
- [x] 3.3 `setup.md`: remove the `SESSION_SECRET=` line from the `.env` example
- [x] 3.4 `docs/dev-second-instance.md`: remove `SESSION_SECRET=agent-verification-only` from both commands
- [x] 3.5 `docs/arch/track-web-architecture.md`: update the Env bullet (no `requireEnv`, no required vars) and remove the note that tests inject `SESSION_SECRET`

## 4. Verify

- [x] 4.1 `npm test` passes without the injected variable
- [x] 4.2 `npm run build:server` succeeds
- [x] 4.3 Start a disposable server with no env file (`env -i PATH=$PATH HOME=$HOME PORT=3100 SQLITE_PATH=<tmp>/x.db npx tsx src/index.ts` from a directory without `.env`, or with `DOTENV_CONFIG_PATH` pointing to an empty file); confirm it listens and `GET /api/version` returns 200 — don't touch the developer's running server
- [x] 4.4 Following `docs/dev-second-instance.md` as rewritten, create a user and log in against the disposable instance, to confirm sessions work without the secret
- [x] 4.5 `openspec validate remove-session-secret --strict`
