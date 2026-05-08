## Purpose

Covers how multiple frontend apps are organized as npm workspaces, how Caddy routes subdomains to each app's dist folder, and how a single backend process serves all apps.

## Requirements

### Requirement: Monorepo workspace layout with multiple client apps
The system SHALL organize frontend applications as separate npm workspaces under the monorepo root. Each client app SHALL build independently with its own Vite config and output to its own dist folder.

#### Scenario: Independent client build
- **WHEN** the developer runs `npm run build:time`
- **THEN** only the time tracker frontend builds, outputting to `client-time/dist/`

#### Scenario: Build watch app standalone
- **WHEN** the developer runs `npm run build:watch`
- **THEN** only the watch frontend builds, outputting to `client-watch/dist/`

#### Scenario: Parallel full build
- **WHEN** the developer runs `npm run build`
- **THEN** all client apps and the backend build in parallel without interfering with each other

### Requirement: Subdomain-based routing via Caddy
The system SHALL route each subdomain to the correct client app's dist folder using Caddy. All `/api/*` requests SHALL be proxied to the single backend process using explicit `handle` blocks. Each subdomain SHALL serve a single-page application with SPA fallback (`try_files` → `index.html`).

> **Note:** Caddy `handle` blocks are required — not plain `reverse_proxy` directives. Without them, `file_server` intercepts POST requests to `/api/*` and returns 405 because `file_server` only handles GET/HEAD. Explicit `handle /api/* { reverse_proxy ... }` ensures all HTTP methods are proxied correctly.

#### Scenario: Client request routed to correct app
- **WHEN** a browser requests `time.branam.us/`
- **THEN** Caddy serves `client-time/dist/index.html`

#### Scenario: Watch app served at subdomain
- **WHEN** a browser requests `watch.branam.us/`
- **THEN** Caddy serves `client-watch/dist/index.html`

#### Scenario: Watch SPA deep link served correctly
- **WHEN** a browser on `watch.branam.us` requests a frontend route (e.g. `/events`)
- **THEN** Caddy serves `client-watch/dist/index.html` so React Router handles the route client-side

#### Scenario: API requests proxied to backend
- **WHEN** a browser on any subdomain makes a request to `/api/*`
- **THEN** Caddy reverse-proxies the request to `localhost:3000` regardless of HTTP method

#### Scenario: SPA deep link served correctly
- **WHEN** a browser on any subdomain requests a frontend route (e.g. `/log`)
- **THEN** Caddy serves the app's `index.html` so React Router handles the route client-side

### Requirement: Watch app builds as an independent workspace
The system SHALL support `client-watch` as a separate npm workspace with its own Vite config (`vite.config.ts` inside `client-watch/`) that builds to `client-watch/dist/`. The `build:watch` script SHALL build only the watch frontend, and `npm run build` SHALL include the watch app alongside all other apps.

### Requirement: Single backend process serves all apps
The system SHALL run exactly one Hono backend process (managed by PM2) that handles API requests from all apps. Each app's API routes SHALL use a distinct prefix (e.g. `/api/time/`, `/api/watch/`).

#### Scenario: PM2 manages one process
- **WHEN** the backend starts via PM2
- **THEN** exactly one Node.js process serves all API routes for all apps

#### Scenario: Route isolation by prefix
- **WHEN** a request arrives at `/api/time/entries`
- **THEN** only time-tracker route handlers execute, not watch or food handlers
