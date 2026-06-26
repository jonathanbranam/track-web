## Context

`client-games` is a single React Router v7 app. `App.tsx` computes
`inGame = /^\/game\//.test(pathname)` and hides `NavBar` while in-game; everything
else shows the bottom nav. There is a precedent for a sub-area: the prototypes
picker at `/game/prototypes`. `NavBar.tsx` is currently a single-item bar ("Games"
→ `/`).

The in-game `ScenarioEditor` (`games/dungeon-tactics-solo/ScenarioEditor.tsx`)
already edits unit defs ("Variants") live through `defStore` and the existing
`/api/games/dungeon-tactics-solo/scenarios/*` endpoints. Relocating it into the
studio needs **no new persistence** — it is the lowest-risk way to prove the shell.

This is the first of three changes that build the studio (shell → content-write
API → map editor). This change is pure front-end.

## Goals / Non-Goals

**Goals:**

- Stand up a generic `/studio` section and a second "Studio" nav tab, structured so
  more games and tools join additively.
- Ship one genuinely working tool — the Variant designer — to validate the shell
  end-to-end against real (existing) persistence.
- Keep the in-game `ScenarioEditor` panel intact; the studio designer is its roomy
  standalone counterpart, editing the same Variants.

**Non-Goals:**

- No map/encounter/wave editor, no content write endpoints, no new backend (later
  changes).
- No admin gate. No multi-game studio content beyond DT (the hub is game-agnostic
  but only DT registers a studio now).
- No redesign of the Variant editor's UX — relocation, not rework.

## Decisions

### `/studio` is a sibling of `/game`, not nested under it

Placing the area at the top-level `/studio` (not `/game/dungeon-tactics/studio`)
keeps it out of the `inGame` namespace so the nav shows normally, and makes "design
tools" a first-class peer of "play" — matching the doc's 50/50 two-tab vision and
leaving room for non-DT tools.

### A registry of studio-enabled games drives both hubs

Rather than hardcode DT into the hub JSX, a small in-client list
(`STUDIO_GAMES = [{ slug, name, hubPath }]`) drives the generic `/studio` hub. The
DT hub similarly lists its tools from a small array (`{ label, path, status }`)
with a `status: 'available' | 'coming-soon'`, so the Map editor can appear as a
disabled card now and light up when its change lands — no restructure.

### Variant designer wraps the existing `ScenarioEditor`

The standalone page mounts the existing component (or a thin extraction of its
panel body) so behavior and persistence are identical to in-game. If the component
is too coupled to the game scene to mount standalone, the minimal extraction is its
def-editing form + `defStore` calls into a presentational component both callers
share. Prefer reuse; extract only as much as needed.

### Nav layout

The bar becomes two equal-width `NavLink`s (Games | Studio). The active-state
styling (`text-indigo-400`) and safe-area padding (`--sab`) are preserved. Icons:
keep the existing controller glyph for Games; a wrench/tools glyph for Studio.

## Risks / Trade-offs

- **`ScenarioEditor` coupling.** It may assume an active game/scene context. *Mitigation:* if it can't mount standalone, extract the presentational form; keep the store wiring shared. Flagged as the first implementation task to de-risk early.
- **Empty-feeling hub.** With one tool, the hub looks thin. *Accepted:* the disabled "Map editor — coming soon" card communicates the arc; the hub is intentionally a frame for growth.

## Migration / Rollout

Purely additive front-end. No DB, no API, no deploy-config changes. Ships behind
normal auth; no flag needed.

## Open Questions

- Does the standalone Variant designer want Variant **list/create/set-default**
  controls surfaced now (the endpoints exist), or just the def-editing form for
  the active Variant? Lean: surface them — it's the "roomy counterpart" the doc
  describes — but acceptable to defer to keep this change small.

## Testing

- Route/render test: `/studio` and `/studio/dungeon-tactics` render under auth and
  redirect to login when unauthenticated.
- Nav test: both tabs render and active-state reflects the current route; nav is
  hidden on `/game/…` and shown on `/studio/…`.
- Variant designer: edits persist through the existing endpoints (reuse/extend the
  existing unit-def editor coverage); the in-game panel still works.
- Build: `npm run build:games` (or the project's games build script) passes with
  zero TypeScript errors.
