**App**: client-proto

## Purpose

Defines the structural and deployment requirements for `client-proto`, the prototype viewer app. Covers the app scaffold, UI shell conventions, authentication policy, deploy wiring, and the CLAUDE.md authoring rules file.

## Requirements

### Requirement: Standalone Vite + React SPA
The `client-proto` app SHALL exist as a standalone Vite + React 19 SPA at the monorepo root, structured identically to the other client apps (`client-time`, `client-watch`, `client-food`), with its own `package.json`, `vite.config.ts`, `index.html`, and `src/` directory.

#### Scenario: App builds successfully
- **WHEN** `npm run build` is executed for `client-proto`
- **THEN** a production-ready static bundle is emitted to `client-proto/dist/`

#### Scenario: Dev server starts
- **WHEN** the dev server is started for `client-proto`
- **THEN** the app is served locally on its designated port with hot module replacement

### Requirement: Mobile-first dark-only UI shell
The app SHALL use Tailwind CSS 4, dark-only styles, and mobile-first layout. Safe areas SHALL be applied via the `--sat` (safe-area-top) and `--sab` (safe-area-bottom) CSS custom properties, consistent with the other client apps.

#### Scenario: Safe area insets applied
- **WHEN** the app is opened on a device with a notch or home indicator
- **THEN** content is inset so it does not overlap system UI elements

#### Scenario: No light mode
- **WHEN** the device OS is set to light mode
- **THEN** the app still renders in dark mode

### Requirement: No authentication required
The app SHALL be accessible without any login or session cookie. The Caddy configuration SHALL serve `client-proto/dist/` on its subdomain without routing requests through the auth middleware.

#### Scenario: Unauthenticated access
- **WHEN** a user navigates to the proto subdomain without a session cookie
- **THEN** the picker screen loads without a redirect to login

### Requirement: Monorepo deployment wiring
The app SHALL be wired into all four deploy configuration files so it builds, serves, and proxies consistently with the other client apps.

#### Scenario: Caddyfile serves static files
- **WHEN** a request arrives at the proto subdomain in production
- **THEN** Caddy serves files from `client-proto/dist/` and falls back to `index.html` for SPA routing

#### Scenario: Local dev proxy configured
- **WHEN** the local Caddy dev proxy is running
- **THEN** requests to the proto subdomain are forwarded to the client-proto dev server port

#### Scenario: Deploy script builds the app
- **WHEN** `server-deploy.sh` is executed on the server
- **THEN** `client-proto` is built as part of the deployment sequence

#### Scenario: Dev session includes proto pane
- **WHEN** `dev-local.sh` is run to start a local dev session
- **THEN** a tmux pane is started for the `client-proto` dev server

### Requirement: CLAUDE.md prototype authoring rules
The `client-proto/` directory SHALL contain a `CLAUDE.md` file that documents the rules Claude Code must follow when creating or modifying prototypes in this app.

#### Scenario: Rules cover self-containment
- **WHEN** `client-proto/CLAUDE.md` is present
- **THEN** it explicitly states that prototype files MUST NOT import from `@packages/*`, from other prototype directories, or from any path outside their own `src/prototypes/<name>/` folder

#### Scenario: Rules cover write-once policy
- **WHEN** `client-proto/CLAUDE.md` is present
- **THEN** it explicitly states that prototypes are write-once and SHALL NOT be refactored to accommodate changes in other parts of the codebase

#### Scenario: Rules cover archiving
- **WHEN** `client-proto/CLAUDE.md` is present
- **THEN** it explains that archiving a prototype means removing its entry from `src/registry.ts` and deleting its `src/prototypes/<name>/` folder
