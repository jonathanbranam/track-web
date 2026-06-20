**App**: admin

## ADDED Requirements

### Requirement: client-admin workspace
The system SHALL provide a `client-admin` npm workspace (package name `@repo/admin`) that builds independently with its own Vite config, outputs to `client-admin/dist/`, and is served at `admin.branam.us`. It SHALL be a React 19 + Vite + Tailwind 4 + PWA app following the same structure as the other client workspaces, run on dev port **6040**, and proxy `/api` to the backend at `localhost:3000`.

#### Scenario: Independent build
- **WHEN** the developer runs `npm run build:admin`
- **THEN** only the admin frontend builds, outputting to `client-admin/dist/`

#### Scenario: Included in full build
- **WHEN** the developer runs `npm run build`
- **THEN** the admin app builds alongside the other clients and the server

#### Scenario: Dev server port
- **WHEN** the developer runs `npm run dev -w client-admin`
- **THEN** the Vite dev server starts on port 6040 and proxies `/api` requests to `localhost:3000`

### Requirement: Admin-only access restricted to user 1
The admin app SHALL be usable only by the owner account, user 1. After authenticating, user 1 SHALL be taken to the admin home; any other authenticated user SHALL be shown an "Access Denied" view instead of admin functionality. This is an intentional exception to the default equal-rights permission model.

#### Scenario: User 1 reaches the admin home after login
- **WHEN** user 1 logs in to the admin app
- **THEN** they are redirected to the admin home page

#### Scenario: Non-admin user sees Access Denied
- **WHEN** an authenticated user whose id is not 1 navigates to any admin route
- **THEN** the app renders an "Access Denied" view and does not show admin functionality

#### Scenario: Unauthenticated visit redirected to login
- **WHEN** an unauthenticated user navigates to any admin route
- **THEN** the app redirects to the login page

### Requirement: Server-side admin guard on admin API
The backend SHALL guard every `/api/admin/*` route with a middleware that requires a valid session and `userId === 1`. Requests without a valid session SHALL receive `401`; authenticated requests from a non-admin user SHALL receive `403`.

#### Scenario: Admin request allowed
- **WHEN** user 1 calls any `/api/admin/*` endpoint with a valid session
- **THEN** the request is processed

#### Scenario: Non-admin request forbidden
- **WHEN** an authenticated user whose id is not 1 calls any `/api/admin/*` endpoint
- **THEN** the backend responds `403`

#### Scenario: Unauthenticated request rejected
- **WHEN** a request to any `/api/admin/*` endpoint has no valid session
- **THEN** the backend responds `401`

### Requirement: API token management page
The admin app SHALL provide a page to create, list, and revoke API tokens, using the existing `/api/auth/tokens` endpoints.

#### Scenario: Manage tokens from the admin app
- **WHEN** user 1 opens the API tokens page
- **THEN** existing tokens are listed and the page offers controls to create a new token and revoke existing ones

### Requirement: Admin app deployment wiring
Adding the admin app SHALL include the deployment updates required for a new client app: a `admin.branam.us` virtual host in `Caddyfile` (static `client-admin/dist` with `/api/*` reverse-proxied to the backend), a local mapping in `Caddyfile.local` to port 6040, a `build:admin` step in `server-deploy.sh`, and a dev pane for `client-admin` in `dev-local.sh`.

#### Scenario: Production host serves the app
- **WHEN** a request reaches `admin.branam.us`
- **THEN** Caddy serves the `client-admin/dist` SPA and reverse-proxies `/api/*` to the backend

#### Scenario: Deploy builds the admin app
- **WHEN** `server-deploy.sh` runs
- **THEN** it executes `npm run build:admin` before restarting the server
