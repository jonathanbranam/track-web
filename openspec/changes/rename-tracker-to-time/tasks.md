## 1. Directory and Package Rename

- [ ] 1.1 Run `git mv client-tracker client-time` to rename the directory while preserving git history
- [ ] 1.2 Update `client-time/package.json`: change `"name": "@repo/tracker"` → `"name": "@repo/time"`
- [ ] 1.3 Update root `package.json` workspace entry: `"client-tracker"` → `"client-time"`
- [ ] 1.4 Update root `package.json` scripts: rename `build:tracker` → `build:time`; update all script commands referencing `client-tracker` or `-w client-tracker` to use `client-time`
- [ ] 1.5 Check `packages/auth/package.json` and `client-movies/package.json` for any `@repo/tracker` dependency references; update to `@repo/time`

## 2. Backend: Routes and App Config

- [ ] 2.1 Update `src/app.ts`: change route prefix `/api/tracker/*` → `/api/time/*` and route registration `/api/tracker/entries` → `/api/time/entries`
- [ ] 2.2 Update `src/app.ts`: change static file paths from `client-tracker/dist` → `client-time/dist` (2 occurrences including the build hint message)

## 3. Database Migration

- [ ] 3.1 Update `src/db.ts` existing `ALTER TABLE` migration: change `DEFAULT 'tracker'` → `DEFAULT 'time'` (affects new installs)
- [ ] 3.2 Add new migration block in `src/db.ts` after the existing `app_id` migration: run `UPDATE time_entries SET app_id = 'time' WHERE app_id = 'tracker'`

## 4. Backend: Repository and Routes

- [ ] 4.1 Update `src/repositories/sqlite/entry.repository.ts`: replace all 5 occurrences of `app_id = 'tracker'` → `app_id = 'time'`
- [ ] 4.2 Update `src/routes/entries.ts`: change `appId: 'tracker'` → `appId: 'time'`
- [ ] 4.3 Update `src/routes/entries.test.ts`: replace all 9 occurrences of `appId: 'tracker'` → `appId: 'time'`

## 5. Frontend: API Routes

- [ ] 5.1 Update `client-time/src/api.ts`: replace all 5 occurrences of `/api/tracker/` → `/api/time/`

## 6. Infrastructure Config

- [ ] 6.1 Update `Caddyfile`: change `client-tracker/dist` → `client-time/dist`
- [ ] 6.2 Update `server-deploy.sh`: change `build:tracker` → `build:time` (both the echo message and the npm run command)
- [ ] 6.3 Update `CLAUDE.md`: replace `build:tracker` and `client-tracker` references with `build:time` and `client-time`

## 7. Build and Verify

- [ ] 7.1 Run `npm install` from repo root to regenerate `package-lock.json` with the new package name and workspace path
- [ ] 7.2 Run `npm run build` and confirm all three targets (time, movies, server) succeed with no type errors
- [ ] 7.3 Run `npm run dev` and confirm the backend starts on port 3000 and the time frontend starts on port 5173
- [ ] 7.4 Smoke-test the full flow: start a timer, stop it, check the log; verify network requests go to `/api/time/entries`
- [ ] 7.5 Query the database and confirm `SELECT DISTINCT app_id FROM time_entries` returns only `'time'`
