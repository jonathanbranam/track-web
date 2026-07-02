**App**: talks

## Purpose

The talks app shell defines the workspace, build, and deployment wiring for the `talks.branam.us` client app — a public, no-auth React 19 + Vite + Tailwind 4 microsite served from the `client-talks` npm workspace with its own standalone visual design (not the shared dark app shell) and no PWA.

## Requirements

### Requirement: client-talks workspace
The system SHALL provide a `client-talks` npm workspace (package name `@repo/talks`) that builds independently with its own Vite config, outputs to `client-talks/dist/`, and is served at `talks.branam.us`. It SHALL be a React 19 + Vite + Tailwind 4 app following the build/deploy structure of the other client workspaces, run on dev port **6055**, and use React Router for client-side routing. It SHALL have its own standalone visual design (not the shared dark app shell) and SHALL NOT be a PWA (no `vite-plugin-pwa`, service worker, or installable manifest). It SHALL include `phaser` as a direct dependency.

#### Scenario: Independent build
- **WHEN** the developer runs `npm run build:talks`
- **THEN** only the talks frontend builds, outputting to `client-talks/dist/`

#### Scenario: Included in full build
- **WHEN** the developer runs `npm run build`
- **THEN** the talks app builds alongside the other clients and the server

#### Scenario: Dev server port
- **WHEN** the developer runs `npm run dev -w client-talks`
- **THEN** the Vite dev server starts on port 6055

### Requirement: Talks app is public
The talks app SHALL be publicly accessible with no authentication. Visitors SHALL reach the landing page and any talk page directly without logging in, and the app SHALL NOT call `GET /api/auth/me` or redirect to a login page.

#### Scenario: Anonymous visitor reaches the site
- **WHEN** an unauthenticated visitor navigates to `talks.branam.us`
- **THEN** the app renders the talks landing page without redirecting to a login page

### Requirement: Talks app deployment wiring
Adding the talks app SHALL include the deployment updates required for a new client app: a `talks.branam.us` virtual host in `Caddyfile` serving the static `client-talks/dist` SPA with an explicit `handle` block reverse-proxying `/api/*` to the backend, a local mapping in `Caddyfile.local` to port 6055, a `build:talks` step in `package.json`, `scripts/build-deploy.sh`, and `server-deploy.sh`, and a dev pane for `client-talks` in `dev-local.sh`.

#### Scenario: Production host serves the app
- **WHEN** a request reaches `talks.branam.us/`
- **THEN** Caddy serves the `client-talks/dist` SPA and reverse-proxies `/api/*` to the backend

#### Scenario: SPA deep link served correctly
- **WHEN** a browser on `talks.branam.us` requests a frontend route (e.g. `/talks/engineering-with-ai`)
- **THEN** Caddy serves `client-talks/dist/index.html` so React Router handles the route client-side

#### Scenario: Deploy builds the talks app
- **WHEN** `server-deploy.sh` runs
- **THEN** it executes `npm run build:talks` before restarting the server

### Requirement: Per-talk rich layout opt-in via kind field
The `Talk` interface in `talks.ts` SHALL include an optional `kind` field. When `kind` is omitted or `'content'`, `TalkPage` SHALL render the standard centered content shell. When `kind` is `'rpg'`, `TalkPage` SHALL render `RpgExperience` instead, bypassing the standard content shell entirely. The `engineering-with-ai` talk entry SHALL be set to `kind: 'rpg'`.

#### Scenario: RPG talk renders RpgExperience
- **WHEN** a browser navigates to `/talks/engineering-with-ai`
- **THEN** `TalkPage` renders `RpgExperience` and does not render the standard title, description, or "Content coming soon" placeholder

#### Scenario: Content talk renders standard shell
- **WHEN** a browser navigates to a talk whose `kind` is omitted or `'content'`
- **THEN** `TalkPage` renders the standard centered content shell as before

#### Scenario: Unknown slug still 404s
- **WHEN** a browser navigates to `/talks/nonexistent-slug`
- **THEN** `TalkPage` renders `NotFoundPage` regardless of the kind field
