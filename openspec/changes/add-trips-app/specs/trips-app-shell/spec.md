**App**: trips

## ADDED Requirements

### Requirement: App served at trips.branam.us
The system SHALL serve the trips client app at `trips.branam.us` via Caddy reverse proxy, with routes configured in `Caddyfile`, `Caddyfile.local`, `server-deploy.sh`, and `dev-local.sh`.

#### Scenario: Production routing
- **WHEN** a request arrives at `trips.branam.us`
- **THEN** Caddy serves the compiled `client-trips/dist/` as a single-page app with SPA fallback

#### Scenario: Local dev routing
- **WHEN** running locally via `dev-local.sh`
- **THEN** the trips app is accessible via its local dev URL with Vite HMR active

### Requirement: Authentication guard
All routes in the trips app SHALL require the user to be authenticated. Unauthenticated users SHALL be redirected to the login page.

#### Scenario: Unauthenticated access
- **WHEN** an unauthenticated user navigates to any trips app URL
- **THEN** the app redirects them to the login page

#### Scenario: Authenticated access
- **WHEN** an authenticated user navigates to the trips app
- **THEN** the app loads and fetches the current trip

### Requirement: Current trip bootstrap
On load, the trips app SHALL call `GET /api/trips/current` to retrieve the active trip. The resulting `trip_id` SHALL be used for all subsequent API operations in the session.

#### Scenario: Current trip exists
- **WHEN** the app loads and the API returns a current trip
- **THEN** the app stores the trip and renders the overview page with that trip's data

#### Scenario: No current trip
- **WHEN** the app loads and the API returns 404 (no current trip set)
- **THEN** the app renders an empty state indicating no active trip is set

### Requirement: Bottom navigation
The trips app SHALL have a fixed bottom navigation bar consistent with other apps in the monorepo, using safe-area insets (`--sab`) for notched devices.

#### Scenario: Nav visible on all pages
- **WHEN** the user is on any page of the trips app
- **THEN** the bottom nav is visible and displays the available pages

### Requirement: PWA shell
The trips app SHALL be registered as a Progressive Web App with a service worker, enabling add-to-home-screen on mobile.

#### Scenario: Install prompt eligibility
- **WHEN** a user visits `trips.branam.us` on a mobile browser
- **THEN** the browser considers the app installable (manifest + service worker present)
