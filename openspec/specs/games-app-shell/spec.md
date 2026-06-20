**App**: games

## Purpose

The `client-games` workspace — the casual games platform served at `games.branam.us`. Covers the auth-gated React 19 + Vite + Tailwind + PWA app, the Phaser 3 React host used to mount games, the client-side game registry that catalogs casual games (single-player and, in future, multiplayer), and the deployment wiring required for the new client app.

## Requirements

### Requirement: client-games workspace
The system SHALL provide a `client-games` npm workspace (package name `@repo/games`) that builds independently with its own Vite config, outputs to `client-games/dist/`, and is served at `games.branam.us`. It SHALL be a React 19 + Vite + Tailwind 4 + PWA app following the same structure as the other client workspaces, run on dev port **6035**, and proxy `/api` to the backend at `localhost:3000`.

#### Scenario: Independent build
- **WHEN** the developer runs `npm run build:games`
- **THEN** only the games frontend builds, outputting to `client-games/dist/`

#### Scenario: Included in full build
- **WHEN** the developer runs `npm run build`
- **THEN** the games app builds alongside the other clients and the server

#### Scenario: Dev server port
- **WHEN** the developer runs `npm run dev -w client-games`
- **THEN** the Vite dev server starts on port 6035 and proxies `/api` requests to `localhost:3000`

### Requirement: Authentication gate
The games app SHALL gate all routes behind the shared `@repo/auth` session. Unauthenticated users SHALL be redirected to a login page; authenticated users SHALL reach the app shell.

#### Scenario: Unauthenticated visit redirected to login
- **WHEN** an unauthenticated user navigates to any games route
- **THEN** the app redirects to the login page

#### Scenario: Authenticated user reaches the app
- **WHEN** an authenticated user navigates to `/`
- **THEN** the games home page renders without redirection

### Requirement: Casual game registry and catalog
The games app SHALL maintain a client-side registry of games where each entry exposes a `slug`, a display `name`, a `category` of `single-player` or `multiplayer`, and a function to mount the game. The home page SHALL render the registry as a catalog of selectable games. The platform SHALL NOT restrict the catalog to turn-based games; both real-time single-player and turn-based multiplayer games are valid entries.

#### Scenario: Catalog lists registered games
- **WHEN** an authenticated user opens the home page
- **THEN** one catalog card is shown for each registered game, displaying its name

#### Scenario: Selecting a game mounts it
- **WHEN** the user selects a game card with slug `s`
- **THEN** the app navigates to that game's route and mounts the game identified by `s`

#### Scenario: Unknown game slug
- **WHEN** the user navigates to a game route whose slug is not in the registry
- **THEN** the app shows a not-found state and offers a link back to the catalog

### Requirement: Phaser host component
The games app SHALL provide a React host component that creates a `Phaser.Game` instance bound to a container element when mounted and destroys it when unmounted. The React layer SHALL own UI outside the canvas (catalog, score display, game-over UI); the Phaser scene SHALL own the game canvas. The scene SHALL report gameplay events (such as score changes and game over) back to React via a callback or emitter supplied at construction.

#### Scenario: Phaser game created on mount
- **WHEN** the host component mounts
- **THEN** a Phaser game instance is created and renders into the host's container element

#### Scenario: Phaser game destroyed on unmount
- **WHEN** the host component unmounts
- **THEN** the Phaser game instance is destroyed and its canvas is removed

#### Scenario: Scene reports events to React
- **WHEN** the scene updates the score or reaches game over
- **THEN** React receives the event through the supplied callback and updates the surrounding UI

### Requirement: Phaser loads from CDN at runtime
The games app SHALL load Phaser from an external CDN import map rather than including it in the bundled JavaScript. The CDN URL SHALL pin an exact Phaser version matching the version used for TypeScript types in `package.json`.

#### Scenario: Phaser resolved via import map before React boots
- **WHEN** the browser loads `index.html`
- **THEN** the `<script type="importmap">` entry for `"phaser"` MUST appear before the React module script so the Phaser ESM module is resolved when game components initialize

#### Scenario: Phaser not included in bundle output
- **WHEN** `npm run build:games` completes
- **THEN** the output in `client-games/dist/` SHALL NOT contain Phaser source code (no Phaser chunk in the bundle)

### Requirement: Games app deployment wiring
Adding the games app SHALL include the deployment updates required for a new client app: a `games.branam.us` virtual host in `Caddyfile` (static `client-games/dist` with `/api/*` reverse-proxied to the backend), a local mapping in `Caddyfile.local` to port 6035, a `build:games` step in `server-deploy.sh`, and a dev pane for `client-games` in `dev-local.sh`.

#### Scenario: Production host serves the app
- **WHEN** a request reaches `games.branam.us`
- **THEN** Caddy serves the `client-games/dist` SPA and reverse-proxies `/api/*` to the backend

#### Scenario: Deploy builds the games app
- **WHEN** `server-deploy.sh` runs
- **THEN** it executes `npm run build:games` before restarting the server
