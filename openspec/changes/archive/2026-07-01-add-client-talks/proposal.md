## Why

There is no place to host presentation and talk content on branam.us. As talks are developed, they need a simple public home — a microsite that lists each talk and links to its content — so they can be shared with a single stable URL (`talks.branam.us`).

## What Changes

- Add a new `client-talks` npm workspace (`@repo/talks`) — a React 19 + Vite + Tailwind 4 frontend served at `talks.branam.us`, following the same structure as the other client apps (dev port **6055**).
- The landing page renders a **card list of talks**, each card showing the talk title, a short description, and a link to that talk's page.
- Seed the directory with the first talk card: **"Developing with AI and My Story of Learning to Be an Engineer and Using AI Coding Agents."**
- Add a per-talk content route so each card links to its own page where the presentation/talk content lives.
- The site is **public** (no authentication) — talk content is meant to be shared openly.
- Add the deployment wiring required for a new client app: a `talks.branam.us` host in `Caddyfile`, a local mapping in `Caddyfile.local`, a `build:talks` step (in `package.json`, `scripts/build-deploy.sh`, and `server-deploy.sh`), and a dev pane in `dev-local.sh`.
- Add a **Talks** card to the home app directory (`client-home` `APPS` array) and update `llm-context.md`.

## Capabilities

### New Capabilities
- `talks-app-shell`: The `client-talks` workspace, build/dev wiring, Caddy subdomain routing, and public (no-auth) serving of the app at `talks.branam.us`.
- `talks-directory`: The public landing page listing talks as cards (title + description + link) and the per-talk content route, seeded with the first talk.

### Modified Capabilities
- `home-app-directory`: Add a **Talks** (`talks.branam.us`) card to the app directory card grid.

## Impact

- **New workspace**: `client-talks/` (Vite config, Tailwind, entry, pages/components) added to the root `package.json` `workspaces` array and build scripts.
- **Deployment/config**: `Caddyfile`, `Caddyfile.local`, `package.json` (`build:talks`, `build`), `scripts/build-deploy.sh`, `server-deploy.sh`, `dev-local.sh`.
- **Cross-app**: `client-home/src/pages/DirectoryPage.tsx` (`APPS` array), `llm-context.md`, `docs/app/planning.md`.
- **Backend/API**: none — the microsite is static and requires no new backend endpoints.
