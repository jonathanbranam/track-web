## 1. Database Migration

- [x] 1.1 Add `trips` table migration to `MIGRATIONS` in `src/db.ts` (columns: `id`, `user_id`, `name`, `destination`, `departure_notes`, `return_notes`, `nights`, `full_days`, `is_current`, `created_at`)
- [x] 1.2 Add `'trips'` to `TABLE_NAMES` in `src/db.ts`

## 2. Backend: Repository

- [x] 2.1 Add `Trip` interface and `ITripRepository` interface to `src/repositories/interfaces.ts` (methods: `create`, `list`, `findById`, `findCurrent`, `setCurrent`, `update`, `delete`)
- [x] 2.2 Implement `SqliteTripRepository` in `src/repositories/sqlite/trip.repository.ts`; wrap `setCurrent` clear+set in a SQLite transaction

## 3. Backend: Routes

- [x] 3.1 Create `src/routes/trips.ts` with routes: `GET /`, `POST /`, `GET /current`, `PUT /:id/set-current`, `PUT /:id`, `DELETE /:id`
- [x] 3.2 Add `ITripRepository` to `createApp()` signature in `src/app.ts`; mount `authMiddleware` on `/api/trips/*` and register the trips router

## 4. Admin CLI

- [x] 4.1 Add `trips:list [--json]` command to `scripts/admin.ts`
- [x] 4.2 Add `trips:create <name> [--destination] [--departure-notes] [--return-notes] [--nights] [--full-days] [--json]` command
- [x] 4.3 Add `trips:set-current <id>` command
- [x] 4.4 Add `trips:update <id> [--name] [--destination] [--departure-notes] [--return-notes] [--nights] [--full-days] [--json]` command
- [x] 4.5 Add `trips:delete <id>` command
- [x] 4.6 Update `README.md` with the new `trips:*` CLI commands

## 5. Client App Scaffold

- [x] 5.1 Create `client-trips/` with `package.json`, `vite.config.ts`, `tsconfig.json`, and `index.html` (model after `client-time`)
- [x] 5.2 Add `client-trips` to the `workspaces` array in root `package.json`; add `"build:trips": "npm run build -w client-trips"` to root scripts; include `build:trips` in the root `build` script
- [x] 5.3 Create `client-trips/src/main.tsx`, `App.tsx`, and `index.css` with React Router v7, auth guard (reuses shared auth package), and bottom nav
- [x] 5.4 Create `client-trips/src/api.ts` fetch wrapper (credentials: include)
- [x] 5.5 Configure `vite-plugin-pwa` in `vite.config.ts` with a web app manifest for the trips app (name, icons, theme color)

## 6. Overview Page

- [x] 6.1 Create `client-trips/src/pages/OverviewPage.tsx`; on mount call `GET /api/trips/current` and store the trip in state
- [x] 6.2 Render trip name and destination as the page heading
- [x] 6.3 Render `departure_notes` in a labeled section; show placeholder text when null/empty
- [x] 6.4 Render `return_notes` in a labeled section; show placeholder text when null/empty
- [x] 6.5 Render trip length (`nights` / `full_days`) when either is set; omit the section when both are null
- [x] 6.6 Render an empty state ("No active trip") when `GET /api/trips/current` returns 404

## 7. Deployment Config

- [x] 7.1 Add `trips.branam.us` block to `Caddyfile` (static file root pointing to `client-trips/dist/`, SPA fallback, reverse proxy for `/api/*`)
- [x] 7.2 Add trips local dev entry to `Caddyfile.local`
- [x] 7.3 Add `client-trips` build step to `server-deploy.sh`
- [x] 7.4 Add trips Vite dev pane to `dev-local.sh`

## 8. Build and Verify

- [x] 8.1 Run `npm install` at repo root to register the new workspace
- [x] 8.2 Run `npm run build:trips` and confirm zero TypeScript/build errors
- [x] 8.3 Run `npm run build:server` and confirm zero TypeScript errors
- [ ] 8.4 Start the dev server and confirm the trips app loads at its local URL with a trip set via the admin CLI
