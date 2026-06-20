**App**: all

## ADDED Requirements

### Requirement: Version file written at deploy time
The deploy script SHALL write a `version.json` file to the project root at the start of each deploy (after `git pull`, before any build step). The file SHALL contain: `sha` (short git SHA, 7 chars), `commitTime` (ISO 8601 UTC of the current HEAD commit), and `buildTime` (ISO 8601 UTC at time of writing).

#### Scenario: version.json written on deploy
- **WHEN** `server-deploy.sh` runs
- **THEN** `version.json` exists in the project root with `sha`, `commitTime`, and `buildTime` fields reflecting the current HEAD commit and the time the script ran

#### Scenario: version.json written before build steps
- **WHEN** the deploy script runs
- **THEN** `version.json` is written before any `npm run build:*` command executes, so the timestamps are consistent even if individual builds take different amounts of time

### Requirement: Public version endpoint
The server SHALL expose `GET /api/version` with no authentication required. The response SHALL be JSON with fields: `sha` (string), `commitTime` (ISO 8601 UTC string or null), `buildTime` (ISO 8601 UTC string or null). If `version.json` is missing or unreadable, `sha` SHALL be `"unknown"` and time fields SHALL be `null`.

#### Scenario: Version info returned when file exists
- **WHEN** `GET /api/version` is requested and `version.json` is present
- **THEN** the server responds `200` with `{ sha, commitTime, buildTime }` matching the contents of `version.json`

#### Scenario: Graceful fallback when file missing
- **WHEN** `GET /api/version` is requested and `version.json` does not exist
- **THEN** the server responds `200` with `{ sha: "unknown", commitTime: null, buildTime: null }`

#### Scenario: Unauthenticated request is allowed
- **WHEN** `GET /api/version` is requested without a session cookie
- **THEN** the server responds `200` (no auth check on this route)

### Requirement: Build-time version constants in each client
Each Vite client app SHALL have `__COMMIT_SHA__` (short SHA string, 7 chars) and `__BUILD_TIME__` (ISO 8601 UTC string) available as compile-time constants via Vite `define`. In non-git environments (e.g., CI without git, local dev without history), `__COMMIT_SHA__` SHALL fall back to `"dev"` and `__BUILD_TIME__` to the build timestamp.

#### Scenario: Constants available at runtime
- **WHEN** any client app bundle is loaded in a browser
- **THEN** `__COMMIT_SHA__` and `__BUILD_TIME__` resolve to the correct string values from the build

#### Scenario: Fallback in non-git environment
- **WHEN** a Vite build runs and `git rev-parse --short HEAD` fails
- **THEN** the build succeeds with `__COMMIT_SHA__` set to `"dev"` rather than failing the build

### Requirement: Per-app hidden version overlay
Each client app SHALL include a `VersionOverlay` component mounted in its app shell. The overlay SHALL be invisible by default and appear only when triggered by the version gesture. When visible, the overlay SHALL display: the client short SHA, the client build time (formatted in US/Eastern), the server short SHA (fetched from `/api/version`), and a match/mismatch indicator comparing client SHA to server SHA. The overlay SHALL auto-dismiss after 4 seconds or immediately on tap/click.

#### Scenario: Overlay hidden by default
- **WHEN** a user loads any client app
- **THEN** no version information is visible anywhere in the UI

#### Scenario: Overlay appears on gesture
- **WHEN** the version gesture is performed
- **THEN** the version overlay appears showing client SHA, build time, server SHA, and match indicator

#### Scenario: Client and server SHA match
- **WHEN** the overlay is shown and the client SHA equals the server SHA
- **THEN** the match indicator shows a positive/matching state

#### Scenario: Client and server SHA differ
- **WHEN** the overlay is shown and the client SHA does not equal the server SHA
- **THEN** the match indicator shows a mismatch state (stale client cache)

#### Scenario: Server unreachable when overlay shown
- **WHEN** the overlay is triggered and `/api/version` cannot be reached
- **THEN** the overlay shows the client SHA and build time with server SHA labeled as "offline"

#### Scenario: Overlay auto-dismisses
- **WHEN** the overlay has been visible for 4 seconds without user interaction
- **THEN** the overlay dismisses automatically

#### Scenario: Overlay dismissed by tap
- **WHEN** the user taps or clicks the visible overlay
- **THEN** the overlay dismisses immediately

### Requirement: Version gesture triggers
The version overlay SHALL be triggered by either of two gestures: a 3-finger touch (any 3 fingers touching the screen simultaneously, detected via `touchstart` with `touches.length >= 3`) anywhere on the page, OR triple-click on the app name/logo element in the navigation bar (3 clicks within 600ms). Both gestures SHALL call the same reveal callback.

#### Scenario: 3-finger touch reveals overlay (mobile)
- **WHEN** a user places 3 or more fingers on the screen simultaneously
- **THEN** the version overlay is revealed

#### Scenario: Triple-click on nav logo reveals overlay (desktop)
- **WHEN** a user clicks the app name or logo in the nav bar 3 times within 600ms
- **THEN** the version overlay is revealed

#### Scenario: Single or double touch does not trigger
- **WHEN** a user touches the screen with 1 or 2 fingers
- **THEN** the version overlay is not triggered

### Requirement: Version CLI command
The admin CLI (`scripts/admin.ts`) SHALL include a `version` command that fetches and prints the server version info. The command SHALL support `--json` for script-friendly output.

#### Scenario: Version command prints info
- **WHEN** `node scripts/admin.ts version` is run
- **THEN** the output includes the server SHA, commit time, and build time in human-readable form

#### Scenario: Version command JSON output
- **WHEN** `node scripts/admin.ts version --json` is run
- **THEN** the output is valid JSON with `sha`, `commitTime`, and `buildTime` fields
