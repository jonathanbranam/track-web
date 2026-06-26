## Why

Dungeon Tactics' board content (regions, maps, encounters) is now serialized and
persisted, but there is nowhere to *author* it. Per `content_model.md`, authoring
cannot live in the play flow — you can't edit a map while playing it — so it moves
into a dedicated **design section** at `/studio`. This change lays that shell: the
route area, a second **"Studio"** bottom-nav tab, a generic hub, and a
Dungeon-Tactics studio hub whose first real tool is the **Variant designer** (the
existing in-game `ScenarioEditor` relocated as a roomy, standalone editor). It
deliberately ships **no map/encounter editor** — that lands in later changes — but
proves the shell end-to-end with zero new backend, since the Variant designer
reuses the unit-def store and endpoints that already exist.

## What Changes

- **New `/studio` route area** in `client-games`, outside the `/game/…` namespace
  so the bottom nav shows normally (it's hidden only in-game). Routes:
  `/studio` (generic hub) and `/studio/dungeon-tactics` (DT hub).
- **Second nav tab.** `NavBar.tsx` gains a **"Studio" → `/studio`** tab beside the
  existing "Games" tab (50/50 split). Both hidden in-game as today.
- **Generic studio hub** (`/studio`) lists games that have a studio (DT only for
  now), so other games' tools can join later without restructuring.
- **DT studio hub** (`/studio/dungeon-tactics`) lists that game's tools. For this
  change it surfaces one working tool — the **Variant designer** — plus a
  placeholder/disabled entry for the forthcoming **Map editor** so the arc is
  visible.
- **Variant designer** (`/studio/dungeon-tactics/variant`): the existing
  `ScenarioEditor` relocated into a standalone studio page. It edits the **same**
  Variants (unit defs) through the **same** `defStore` + existing
  `/scenarios/:s/unit-defs` endpoints — no new persistence. The **in-game**
  `ScenarioEditor` panel **stays** as the quick live-tuning affordance.
- **No admin gate** — consistent with the in-game editor, open to any logged-in
  user (the project's equal-rights default).
- **Out of scope (explicitly excluded):** any map/encounter/wave editing, any
  content **write** endpoints (a separate change adds those), and any new backend.

## Capabilities

### New Capabilities

- `games-studio-shell`: The generic `/studio` design-tools section — its route
  area, the second **"Studio"** bottom-nav tab (shown outside `/game/…`, hidden
  in-game), and the hub that lists games offering a studio. Game-agnostic so other
  games' tools can join later.
- `dungeon-tactics-studio`: The Dungeon-Tactics studio hub at
  `/studio/dungeon-tactics` listing its tools, and the **Variant designer** — the
  existing `ScenarioEditor` relocated as a standalone page editing the same
  Variants through the existing unit-def store and endpoints.

## Impact

- **Client routing** (`client-games/src/App.tsx`): register `/studio` and
  `/studio/dungeon-tactics` (+ `/studio/dungeon-tactics/variant`) under
  `AuthGuard`; the existing `inGame` test (`/^\/game\//`) already keeps the nav
  visible on `/studio/…`.
- **Nav** (`client-games/src/components/NavBar.tsx`): add the second tab; adjust
  layout to a 50/50 two-tab bar.
- **New pages** (`client-games/src/pages/` or a `studio/` subfolder):
  `StudioHomePage`, `DungeonTacticsStudioPage`, and a `VariantDesignerPage`
  wrapper around the relocated `ScenarioEditor`.
- **Reuse, not new backend:** the Variant designer uses the existing `defStore`
  and `/api/games/dungeon-tactics-solo/scenarios/*` endpoints unchanged.
- **No deployment-config changes** (no new app/subdomain; `games.branam.us` already
  serves `client-games`). **No DB or API changes.**
- **Docs**: note the new `/studio` area in `llm-context.md` (new feature area).
