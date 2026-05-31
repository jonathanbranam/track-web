## Context

The project is a monorepo with a shared Hono + SQLite backend serving multiple React client apps (`client-time`, `client-watch`, `client-food`). Each app lives in its own `client-*/` directory, gets its own Caddy subdomain, and talks to a dedicated `/api/<app>/` namespace on the backend. The repository pattern (interfaces in `src/repositories/interfaces.ts`, SQLite implementations in `src/repositories/sqlite/`) is established and must be followed. An admin CLI (`scripts/admin.ts`, Commander-based) provides script access to all backend operations; every new API capability must have a corresponding CLI command with `--json` output.

## Goals / Non-Goals

**Goals:**
- Add a `client-trips` app with the same shell pattern as existing apps (Vite, React 19, React Router v7, Tailwind CSS 4, auth guard, PWA, bottom nav)
- Store trips and itinerary entries in SQLite with the existing migration system
- Expose a multi-trip API where one trip is designated *current*; all resource routes are scoped by `trip_id`
- The app bootstraps by fetching the current trip and passes that `trip_id` to all subsequent requests
- Add `trips:*` admin CLI commands covering all API operations
- Wire up the new subdomain in Caddyfile, Caddyfile.local, server-deploy.sh, and dev-local.sh

**Non-Goals:**
- Trip sharing or social features
- Offline mutation support (PWA caches assets; API calls still require connectivity)
- In-app trip selection UI (managing which trip is current is an admin/future concern for now)

## Decisions

### Current-trip via `is_current` flag on the trips table

**Decision:** A boolean `is_current` column on `trips`. `PUT /api/trips/:id/set-current` clears all rows for the user then sets the target row. `GET /api/trips/current` returns the row where `is_current = 1`.

**Alternatives considered:**
- *Separate `user_settings` table with `current_trip_id` FK* — adds a join and an extra table for a single scalar; not worth it for a single-user app.
- *URL path parameter in the client (no current concept)* — requires the user to navigate to a specific trip; complicates the app's bootstrap flow. The current-trip fetch is simpler for mobile use.

### Overview data stored as unstructured text fields

**Decision:** The trips table stores overview info as free-text columns rather than a structured itinerary schema:
- `departure_notes TEXT` — time to leave home, flight number, departure time, etc.
- `return_notes TEXT` — return flight info, time to leave for the airport, etc.
- `nights INTEGER` — number of nights at the destination
- `full_days INTEGER` — number of full days at the destination

The app is informational for the family on the trip, not a data platform. Free text avoids imposing a rigid schema on inherently variable trip details (some trips have flights, some don't; layovers vary; etc.) and lets the user write whatever is useful.

**Alternatives considered:**
- *Structured flight fields (airline, flight number, departure time, arrival time)* — too rigid; forces an awkward model onto trips that don't fit (road trips, cruises, multi-leg itineraries).
- *Single `notes` blob* — simpler, but departure and return are naturally separate concerns that benefit from distinct fields.

### All trip resource routes under `/api/trips/`

For this change the only resource is the trip itself. Routes are flat (no nested resource sub-routes):
- `GET /api/trips/current` — fetch the current trip
- `GET /api/trips` — list all trips
- `POST /api/trips` — create a trip
- `PUT /api/trips/:id` — update trip fields (name, destination, notes, nights, full_days)
- `DELETE /api/trips/:id` — delete a trip
- `PUT /api/trips/:id/set-current` — designate as current trip

### Repository interface for Trip only

Add `ITripRepository` to `src/repositories/interfaces.ts`, implement in `src/repositories/sqlite/trip.repository.ts`. No sub-resource repositories in this change.

### Single migration for the trips table

Add the `trips` table in one new migration (e.g., `0010_add_trips`). Add `trips` to `TABLE_NAMES` in `src/db.ts`.

## Risks / Trade-offs

- **No current trip on fresh install** — `GET /api/trips/current` returns 404 if no trip exists or none is marked current. The client must handle this state (empty/onboarding screen rather than a crash).
- **`set-current` is a two-step write** — clear all, then set one. If the process crashes between the two statements, no trip is current. Wrap in a SQLite transaction to prevent this.
- **Free text is unvalidated** — departure/return notes are stored and displayed as-is. No parsing or validation; the family types what's useful to them.

## Migration Plan

1. Add migration to `src/db.ts` creating the `trips` table; update `TABLE_NAMES`.
2. Add `ITripRepository` to `src/repositories/interfaces.ts`; implement in `src/repositories/sqlite/trip.repository.ts`.
3. Add route file `src/routes/trips.ts`; register in `src/app.ts`.
4. Add `trips:*` commands to `scripts/admin.ts`.
5. Scaffold `client-trips/` (copy Vite config from an existing client app, update name/port).
6. Implement the React app: auth guard → fetch current trip → render overview page (departure notes, return notes, nights/full days).
7. Update `Caddyfile`, `Caddyfile.local`, `server-deploy.sh`, `dev-local.sh`.

Rollback: the migration adds one new table only; dropping it restores prior state. No existing tables are modified.

## Resolved Decisions

- **Subdomain:** `trips.branam.us`
- **Auto-set-current on create:** No. `POST /api/trips` creates the trip without touching `is_current`. The current trip is set explicitly via `PUT /api/trips/:id/set-current`.
