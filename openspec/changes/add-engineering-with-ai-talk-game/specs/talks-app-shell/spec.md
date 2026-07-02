**App**: talks

## MODIFIED Requirements

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

## ADDED Requirements

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
