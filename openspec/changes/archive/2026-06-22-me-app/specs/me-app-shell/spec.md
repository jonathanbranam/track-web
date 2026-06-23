**App**: me

## Purpose

The `client-me` workspace — the personal hub at `me.branam.us`, accessible to any authenticated user. Covers the auth-gated React app, the shared login page, the dev/prod deployment wiring, and the bottom nav with Account and People tabs.

## ADDED Requirements

### Requirement: client-me workspace
The system SHALL provide a `client-me` npm workspace (package name `@repo/me`) that builds independently with its own Vite config, outputs to `client-me/dist/`, and is served at `me.branam.us`. It SHALL be a React 19 + Vite + Tailwind 4 + PWA app following the same structure as the other client workspaces, run on dev port **6045**, and proxy `/api` to the backend at `localhost:3000`.

#### Scenario: Independent build
- **WHEN** the developer runs `npm run build:me`
- **THEN** only the me frontend builds, outputting to `client-me/dist/`

#### Scenario: Included in full build
- **WHEN** the developer runs `npm run build`
- **THEN** the me app builds alongside the other clients and the server

#### Scenario: Dev server port
- **WHEN** the developer runs `npm run dev -w client-me`
- **THEN** the Vite dev server starts on port 6045 and proxies `/api` requests to `localhost:3000`

### Requirement: All authenticated users may access me.branam.us
The me app SHALL be accessible to any authenticated user. After authenticating, the user SHALL be taken to the Account page. Unauthenticated requests SHALL be redirected to the login page.

#### Scenario: Authenticated user reaches account page
- **WHEN** an authenticated user navigates to `me.branam.us`
- **THEN** they are shown the Account page

#### Scenario: Unauthenticated visit redirected to login
- **WHEN** an unauthenticated user navigates to any me route
- **THEN** the app redirects to the login page

### Requirement: Two-tab bottom navigation
The me app SHALL provide a fixed bottom nav with two tabs: **Account** (`/account`) and **People** (`/people`).

#### Scenario: Account tab navigates correctly
- **WHEN** the user taps the Account tab
- **THEN** the app navigates to `/account` and the Account tab appears active

#### Scenario: People tab navigates correctly
- **WHEN** the user taps the People tab
- **THEN** the app navigates to `/people` and the People tab appears active

### Requirement: me app deployment wiring
Adding the me app SHALL include the deployment updates required for a new client app: a `me.branam.us` virtual host in `Caddyfile` (static `client-me/dist` with `/api/*` reverse-proxied to the backend), a local mapping in `Caddyfile.local` to port 6045, a `build:me` step in `server-deploy.sh`, and a dev pane for `client-me` in `dev-local.sh`.

#### Scenario: Production host serves the app
- **WHEN** a request reaches `me.branam.us`
- **THEN** Caddy serves the `client-me/dist` SPA and reverse-proxies `/api/*` to the backend

#### Scenario: Deploy builds the me app
- **WHEN** `server-deploy.sh` runs
- **THEN** it executes `npm run build:me` before restarting the server
