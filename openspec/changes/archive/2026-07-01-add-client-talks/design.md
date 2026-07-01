## Context

branam.us hosts a set of client apps as independent npm workspaces (`client-time`, `client-watch`, `client-home`, …), each a React 19 + Vite + Tailwind 4 SPA served from its own `dist/` folder behind Caddy at a dedicated subdomain, with `/api/*` reverse-proxied to a single Hono backend. Adding a new app is a well-worn pattern that requires coordinated edits across build, deploy, and proxy config (`Caddyfile`, `Caddyfile.local`, `package.json`, `scripts/build-deploy.sh`, `server-deploy.sh`, `dev-local.sh`).

This change adds `client-talks` — a public microsite at `talks.branam.us` for hosting presentation/talk content. It differs from the existing apps in one important way: it is **public**, with no authentication and no backend dependency.

## Goals / Non-Goals

**Goals:**
- Stand up a new `client-talks` workspace using the client-app build/deploy pattern (React 19 + Vite + Tailwind 4, React Router) but with its own standalone visual design rather than the shared dark app shell.
- A landing page listing talks as cards (title + short description + link).
- Seed the first talk: "Developing with AI and My Story of Learning to Be an Engineer and Using AI Coding Agents."
- Wire up build, deploy, and Caddy routing consistent with the other apps.
- Surface the app on the home directory (`client-home`).

**Non-Goals:**
- No CMS, database, or backend endpoints — talk content is defined in the frontend.
- No authentication or per-user state.
- No talk-authoring UI; new talks are added by editing source and redeploying.
- **No talk content format decided yet.** Talk pages are minimal placeholders in this change (title + "coming soon"); how a talk is actually presented (prose page, embedded deck, or in-browser slide runner) is deferred to a future change.
- No PWA / service worker / installable manifest — this is a public read-only microsite.

## Decisions

### Talk content as a static in-app data module
Talks are defined as a typed array (e.g. `talks.ts`: `{ slug, title, description, ... }`) consumed by both the landing page and the per-talk route. The landing page maps over it to render cards; the talk route looks up by `slug`.
- **Why**: Matches the repo's simplicity for content-light apps, needs no backend, and keeps the first talk trivial to add. Adding a talk is a one-line data edit plus its content.
- **Alternatives considered**: A backend endpoint + SQLite table (rejected — no dynamic data, adds deploy/migration surface for no benefit); loading Markdown files at build time (deferred — reasonable future enhancement but heavier than needed for one seed talk).

### Public app — no auth, no `/api/auth/me`
Unlike `client-home` and the other apps, `client-talks` does not gate on auth or call the auth API. The Caddy host still includes the standard `handle /api/* { reverse_proxy … }` block for consistency and future use, but the app itself makes no API calls.
- **Why**: Talk content is meant to be shared openly; forcing login would defeat the purpose.
- **Alternatives considered**: Reusing the shared auth guard (rejected — contradicts the public intent).

### Dev port 6055
Follows the established +5 increment (existing ports run 6010–6050); 6055 is the next free slot.
- **Why**: Keeps the port map predictable and collision-free.

### React Router for routing
Two routes: `/` (landing) and `/talks/:slug` (talk page), with a not-found fallback. Mirrors the other apps' use of `react-router-dom@7`.
- **Why**: Consistency and SPA deep-linking; Caddy's `try_files → index.html` fallback already supports it.

### Cards-first: placeholder talk pages
The landing card list is the deliverable for this change. The `/talks/:slug` route exists and renders the talk title, but its body is a minimal placeholder ("content coming soon") until the content format is chosen.
- **Why**: The content format (prose vs embedded deck vs slide runner) is a separate, larger decision; shipping the shell + card list now unblocks adding real content later without rework to routing or deploy wiring.

### Standalone visual design, no PWA
Unlike the other apps (dark-only shared shell + `vite-plugin-pwa`), `client-talks` gets its own lighter, presentation-oriented styling and omits the PWA plugin/manifest and service worker.
- **Why**: It's a public, read-only microsite meant to be shared and skimmed, not installed. A distinct look suits a public-facing site; a service worker would add caching complexity for no user benefit here.
- **Alternatives considered**: Mirroring `client-home` verbatim (rejected — pulls in the dark app shell and PWA that don't fit a public microsite). Note the Vite config is still copied from `client-home` but with the `VitePWA` plugin removed.

## Risks / Trade-offs

- **[Config drift across the many files a new app touches]** → Follow the CLAUDE.md "Keep in sync" checklist and verify each file (`Caddyfile`, `Caddyfile.local`, `package.json` build scripts, `scripts/build-deploy.sh`, `server-deploy.sh`, `dev-local.sh`, `client-home` APPS, `llm-context.md`).
- **[Public site exposes `/api/*` via the Caddy handle block]** → The app makes no API calls; the proxy block only forwards to the same backend the other apps use, and no new endpoints are added, so attack surface is unchanged. Acceptable.
- **[Home directory card counts are referenced in specs/tests]** → The `home-app-directory` delta updates the card inventory and the "sees N cards" scenarios (six→seven for standard users, eight→nine total) to stay consistent.

## Migration Plan

1. Add the `client-talks` workspace and scaffold (Vite config on port 6055, Tailwind, entry, routes, pages, talks data).
2. Register the workspace and `build:talks` in root `package.json`; add it to the `build` concurrently list.
3. Add build/deploy wiring: `scripts/build-deploy.sh`, `server-deploy.sh`, `dev-local.sh`.
4. Add Caddy routing: `talks.branam.us` host in `Caddyfile` (static + `/api/*` handle), and the local `:6055` mapping in `Caddyfile.local`.
5. Add the Talks card to `client-home` `DirectoryPage` `APPS`, and update `llm-context.md`.
6. Deploy by pushing to `main`; Caddy provisions TLS for `talks.branam.us` on first request via the existing `*.branam.us` wildcard DNS. Rollback = revert the commit and redeploy (no data/migrations involved).

## Open Questions

- **Talk content format** (deferred, not blocking): whether talk pages become written articles, embedded slide decks, or an in-browser slide runner. Resolved as "cards-first with placeholder pages" for this change; the format will be decided in a follow-up before real content is added.
- Standalone visual direction for the public site (typography, palette) — to be refined during implementation; not a spec-level requirement.
