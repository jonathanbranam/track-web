**App**: home

## ADDED Requirements

### Requirement: client-home workspace
The system SHALL provide a `client-home` npm workspace (package name `@repo/home`) that builds independently with its own Vite config, outputs to `client-home/dist/`, and is served at `home.branam.us`. It SHALL be a React 19 + Vite + Tailwind 4 + PWA app following the same structure as the other client workspaces, run on dev port **6050**, and proxy `/api` to the backend at `localhost:3000`.

#### Scenario: Independent build
- **WHEN** the developer runs `npm run build:home`
- **THEN** only the home frontend builds, outputting to `client-home/dist/`

#### Scenario: Included in full build
- **WHEN** the developer runs `npm run build`
- **THEN** the home app builds alongside the other clients and the server

#### Scenario: Dev server port
- **WHEN** the developer runs `npm run dev -w client-home`
- **THEN** the Vite dev server starts on port 6050 and proxies `/api` requests to `localhost:3000`

### Requirement: Home app deployment wiring
Adding the home app SHALL include the deployment updates required for a new client app: a `home.branam.us` virtual host in `Caddyfile` (static `client-home/dist` with `/api/*` reverse-proxied to the backend), a local mapping in `Caddyfile.local` to port 6050, a `build:home` step in `server-deploy.sh`, and a dev pane for `client-home` in `dev-local.sh`.

#### Scenario: Production host serves the app
- **WHEN** a request reaches `home.branam.us`
- **THEN** Caddy serves the `client-home/dist` SPA and reverse-proxies `/api/*` to the backend

#### Scenario: Deploy builds the home app
- **WHEN** `server-deploy.sh` runs
- **THEN** it executes `npm run build:home` before restarting the server
