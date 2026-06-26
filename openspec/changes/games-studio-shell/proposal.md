## Why

Dungeon Tactics' board content (regions, maps, encounters) is now serialized and
persisted, but there is nowhere to *author* it. Per `content_model.md`, authoring
cannot live in the play flow — you can't edit a map while playing it — so it moves
into a dedicated **design section** at `/studio`. This change lays that shell: the
route area, a second **"Studio"** bottom-nav tab, a generic hub, and a
Dungeon-Tactics studio hub whose first real tool is the **Unit Designer** (the
existing in-game `ScenarioEditor` relocated as a roomy, standalone editor — it
edits unit definitions and can non-destructively save them as **Variants**). It
deliberately ships **no map/encounter editor** — that lands in later changes — but
proves the shell end-to-end with zero new backend, since the Unit Designer
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
  change it surfaces one working tool — the **Unit Designer** — plus a
  placeholder/disabled entry for the forthcoming **Map editor** so the arc is
  visible.
- **Unit Designer** (`/studio/dungeon-tactics/unit-designer`): the existing
  `ScenarioEditor` relocated into a standalone studio page. It edits the **same**
  unit definitions — and non-destructively saves them as the **same** Variants —
  through the **same** `defStore` + existing `/scenarios/:s/unit-defs` endpoints —
  no new persistence. The **in-game** `ScenarioEditor` panel **stays** as the quick
  live-tuning affordance.
- **HUD in ReactDOM.** All HUD/chrome elements rendered alongside the game canvas
  SHALL be ReactDOM (HTML overlays / React components), not painted into the
  Phaser canvas. The studio pages and the Unit Designer are already React; the
  in-game DT HUD (Done / Reset / Undo / confirm modal) — currently drawn in Phaser
  (`DungeonTacticsGame.tsx`) — is migrated to a ReactDOM overlay so HUD rendering
  is uniform across play and studio.
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
  `/studio/dungeon-tactics` listing its tools, and the **Unit Designer** — the
  existing `ScenarioEditor` relocated as a standalone page editing the same unit
  definitions (savable as the same Variants) through the existing unit-def store
  and endpoints. Includes migrating the in-game DT HUD from Phaser to ReactDOM.

## Impact

- **Client routing** (`client-games/src/App.tsx`): register `/studio` and
  `/studio/dungeon-tactics` (+ `/studio/dungeon-tactics/unit-designer`) under
  `AuthGuard`; the existing `inGame` test (`/^\/game\//`) already keeps the nav
  visible on `/studio/…`.
- **Nav** (`client-games/src/components/NavBar.tsx`): add the second tab; adjust
  layout to a 50/50 two-tab bar.
- **New pages** (`client-games/src/pages/` or a `studio/` subfolder):
  `StudioHomePage`, `DungeonTacticsStudioPage`, and a `UnitDesignerPage`
  wrapper around the relocated `ScenarioEditor`.
- **In-game HUD → ReactDOM** (`client-games/src/games/dungeon-tactics-solo/`):
  move the Done / Reset / Undo / confirm-modal HUD out of the Phaser scene
  (`DungeonTacticsScene.ts` `drawHud`/UI camera) into a ReactDOM overlay in
  `DungeonTacticsGame.tsx`, driven by the existing `hud-*` game events; remove the
  Phaser-drawn HUD controls and their screen-space hit regions.
- **Reuse, not new backend:** the Unit Designer uses the existing `defStore`
  and `/api/games/dungeon-tactics-solo/scenarios/*` endpoints unchanged.
- **No deployment-config changes** (no new app/subdomain; `games.branam.us` already
  serves `client-games`). **No DB or API changes.**
- **Docs**: note the new `/studio` area in `llm-context.md` (new feature area).
