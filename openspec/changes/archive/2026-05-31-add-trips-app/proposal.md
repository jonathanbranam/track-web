## Why

Family trips require coordination across itinerary, packing, and activities — none of which have a shared home today. A dedicated trips app brings planning into one mobile-friendly place, accessible from the road or trail.

## What Changes

- New `client-trips` app (React 19, Vite, React Router v7, Tailwind CSS 4) alongside existing client apps
- New backend routes under `/api/trips/` for trip data persistence
- New SQLite tables for trip metadata and itinerary entries
- Updated `Caddyfile`, `Caddyfile.local`, `server-deploy.sh`, and `dev-local.sh` to serve and deploy the trips app on its own subdomain
- Multi-trip data model with a designated *current trip*: the API exposes a current-trip endpoint; all resource operations accept a `trip_id`; the app fetches the current trip on load and uses that `trip_id` for all subsequent requests

## Capabilities

### New Capabilities

- `trips-app-shell`: Client app infrastructure — Vite config, React Router setup, auth guard, PWA shell, bottom nav, and deployment wiring for the trips subdomain
- `trip-data`: Core data model and backend API — trips table with a current-trip flag, overview fields stored as unstructured text (departure info, return info, trip length), `GET /api/trips/current` endpoint, all resource routes scoped by `trip_id`, SQLite persistence
- `trip-plan`: Overview page — the default landing page; displays departure info, return info, and trip length (nights/full days) pulled from the current trip's text fields

### Modified Capabilities

<!-- None — deployment and hosting patterns are unchanged; trips follows the established multi-app pattern -->

## Impact

- **New files**: `client-trips/` Vite project; backend route files under `src/routes/`; new SQLite migration in `src/db.ts`
- **Updated config**: `Caddyfile`, `Caddyfile.local`, `server-deploy.sh`, `dev-local.sh`
- **Dependencies**: No new npm packages expected; same stack as existing apps
- **Auth**: Shared SSO session (cookie-based); trips app routes behind existing auth middleware
