## ADDED Requirements

### Requirement: Watch app builds as an independent workspace
The system SHALL support `client-watch` as a separate npm workspace with its own Vite config (`vite.config.watch.ts`) that builds to `client-watch/dist/`. The `build:watch` script SHALL build only the watch frontend, and `npm run build` SHALL include the watch app alongside all other apps.

#### Scenario: Build watch app standalone
- **WHEN** the developer runs `npm run build:watch`
- **THEN** only the watch frontend builds, outputting to `client-watch/dist/`

#### Scenario: Full build includes watch app
- **WHEN** the developer runs `npm run build`
- **THEN** the watch frontend is built as part of the full build without interfering with other apps

### Requirement: watch.branam.us routed to watch app
The system SHALL route the `watch.branam.us` subdomain to `client-watch/dist/` via Caddy, following the same explicit handle-block pattern used by other subdomains.

#### Scenario: Watch app served at subdomain
- **WHEN** a browser requests `watch.branam.us/`
- **THEN** Caddy serves `client-watch/dist/index.html`

#### Scenario: Watch API requests proxied to backend
- **WHEN** a browser on `watch.branam.us` makes a request to `/api/watch/*`
- **THEN** Caddy reverse-proxies the request to `localhost:3000`

#### Scenario: Watch SPA deep link served correctly
- **WHEN** a browser on `watch.branam.us` requests a frontend route (e.g. `/events`)
- **THEN** Caddy serves `client-watch/dist/index.html` so React Router handles the route client-side

## MODIFIED Requirements

### Requirement: Single backend process serves all apps
The system SHALL run exactly one Hono backend process (managed by PM2) that handles API requests from all apps. Each app's API routes SHALL use a distinct prefix (e.g. `/api/time/`, `/api/watch/`).

#### Scenario: PM2 manages one process
- **WHEN** the backend starts via PM2
- **THEN** exactly one Node.js process serves all API routes for all apps

#### Scenario: Route isolation by prefix
- **WHEN** a request arrives at `/api/time/entries`
- **THEN** only time-tracker route handlers execute, not watch or food handlers
