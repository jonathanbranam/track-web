## Context

The monorepo has three production client apps (`client-time`, `client-watch`, `client-food`). UI exploration currently has no safe home — sketching a new screen means either committing throwaway code to a production app or working blind without a real device. A dedicated `client-proto` app provides a walled sandbox: mobile-targeted, no auth, no backend, completely disposable.

Key constraints from the user:
- Prototypes must be **write-once** — no refactoring pressure, ever
- The `@packages/` shared workspace (`packages/ui`, `packages/auth`) must not be imported in prototype files
- Each prototype must be independent: archiving one affects nothing else
- No authentication required to view prototypes

## Goals / Non-Goals

**Goals:**
- New `client-proto` Vite + React 19 SPA, wired into the monorepo exactly like the other client apps
- A picker screen at `/` that lists all registered prototypes as tappable links
- Each prototype lives at its own URL subfolder (`/proto/<name>/`); browser back returns to the picker — no custom gesture needed
- Prototypes are registered in a single index file; archiving = removing the entry
- Prototype files may only import from `react`, `react-dom`, and Tailwind CSS — no `@packages/` and no cross-prototype imports
- No auth middleware on the proto subdomain
- All required deploy config files updated (Caddyfile, Caddyfile.local, server-deploy.sh, dev-local.sh)

**Non-Goals:**
- Gesture-based variation switching (two-finger swipe / three-finger tap) — the picker+subfolder model is simpler, more discoverable, and needs no special touch handling
- Shared component library within `client-proto` — self-containment is the whole point
- Backend routes or data persistence for any prototype
- Authentication of any kind
- Any relationship between `client-proto` and the production apps at runtime

## Decisions

**1. Navigation: Picker screen + subfolder URLs + browser back**

Each prototype is reachable at `/proto/<name>/`. The picker screen (`/`) lists all registered prototypes as full-width tappable rows. Tapping navigates to the prototype URL; the browser back button returns to the picker.

_Why over gesture switching_: No custom touch event handling, works on all browsers, is immediately discoverable on first use, and adds zero complexity to individual prototype components. The gesture option was designed for cases where the prototype _is_ the full screen — the subfolder model is strictly cleaner.

**2. Single Vite SPA, not per-prototype builds**

All prototypes are part of one `client-proto` React app with React Router. The router handles `/` (picker) and `/proto/:name/*` (prototype component). Caddy serves one static root.

_Why not one Vite app per prototype_: Per-prototype builds would require separate Caddyfile entries, separate build steps, and separate dev servers for each prototype. A single app with routing gives the same isolation guarantee to the user (each prototype is at its own URL) without the operational overhead.

**3. Central registry file**

`src/registry.ts` exports a typed array of `{ name: string; label: string; path: string; Component: React.FC }` objects. Each prototype is an entry. Archiving a prototype = deleting or commenting out its entry.

_Why not auto-discovery_: Auto-discovery (e.g., Vite glob imports) is implicit and harder to control. An explicit registry is readable, grep-able, and makes archiving a one-line change.

**4. Self-containment enforced by convention + CLAUDE.md**

Prototype files live at `src/prototypes/<name>/index.tsx`. They may import from `react`, `react-dom`, standard browser APIs, and Tailwind CSS classes. No imports from `../../` that leave their own folder, no `@packages/*`, no imports from other prototype directories.

A `CLAUDE.md` at the root of `client-proto/` codifies these rules so Claude Code enforces them automatically when working in the prototype app. It covers: no `@packages/` imports, no shared components between prototypes, each prototype is self-contained in its own directory, archiving = removing the registry entry and deleting the folder, and that prototypes are write-once (never refactored to accommodate external changes).

This is a **convention**, not a lint rule — but with CLAUDE.md in place, Claude Code will refuse to violate the rules without being told to override them.

**5. No authentication on the proto subdomain**

The proto app is excluded from the auth middleware. It relies on network-level access control (VPN, private network, or local-only) rather than session cookies.

_Why_: The whole point is low-friction access on a real device during development. Adding auth creates friction and requires session infrastructure that adds no value for a personal sandbox.

## Risks / Trade-offs

- **Bundle growth**: All prototype components are bundled into one SPA. As prototypes accumulate the bundle grows, but since this is a dev tool with a single user on a fast connection, this is acceptable. Archiving old prototypes keeps it manageable.
- **Convention not enforced**: The self-containment rule (no `@packages/` imports) relies on discipline. A stray import won't break the app, but it creates the refactoring coupling we're trying to avoid. A comment in the registry file and a note in CLAUDE.md provide the guardrail.
- **No auth = publicly reachable if misconfigured**: If the server is exposed without a VPN, `/proto` routes are accessible without login. Acceptable for a personal self-hosted setup; documented in the Caddyfile comment.

## Open Questions

_(none — design is fully resolved by the decisions above)_
