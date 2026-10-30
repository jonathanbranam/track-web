**App**: time

## Purpose

The time app shell defines the routing, navigation and PWA wiring of the `client-time` workspace (the original Track app). The entry, log, tag and time-picker behaviour lives in `time-entries`, `daily-log`, `edit-entry`, `tags` and `time-adjustment`.

## Requirements

### Requirement: Routes and auth gating
The app SHALL provide a login page at `/login`, a logout page at `/logout`, a closed-beta page at `/beta`, the timer page (`HomePage`) at `/` and the log page (`LogPage`) at `/log`. `/` and `/log` SHALL be wrapped in `AuthGuard` from `@repo/auth`. Any other path SHALL redirect to `/`.

#### Scenario: Unauthenticated visit
- **WHEN** a signed-out user opens `/` or `/log`
- **THEN** the shared auth guard handles the login flow instead of rendering the page

#### Scenario: Signed-in user opens login
- **WHEN** a signed-in user opens `/login`
- **THEN** they are redirected to `/`

#### Scenario: Unknown path
- **WHEN** the user opens a path that matches no route
- **THEN** they are redirected to `/`

### Requirement: Bottom navigation and user chip
While signed in, the app SHALL show a fixed bottom navigation bar with two links, "Timer" (`/`) and "Log" (`/log`), highlighting the active one, and the shared `UserChip`. Neither is shown when signed out.

#### Scenario: Navigate between pages
- **WHEN** the user taps "Log" in the bottom bar
- **THEN** the log page opens and "Log" is highlighted

### Requirement: Workspace, PWA and dev port
The app SHALL be a React 19 + Vite + Tailwind 4 PWA (`vite-plugin-pwa`, name "Track") in the `client-time` npm workspace, built with `npm run build:time` into `client-time/dist/`. Its dev server SHALL listen on the `time` port from `packages/config/dev-ports.json` (6010), overridable with `VITE_DEV_PORT`. It SHALL render the shared `VersionOverlay` with the build's commit SHA and time.

#### Scenario: Independent build
- **WHEN** the developer runs `npm run build:time`
- **THEN** only the time frontend builds, outputting to `client-time/dist/`
