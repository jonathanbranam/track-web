## 1. Studio route area + nav tab

- [ ] 1.1 Add `/studio` and `/studio/dungeon-tactics` routes in `client-games/src/App.tsx` under `AuthGuard`; confirm the existing `inGame` test (`/^\/game\//`) leaves the nav visible on `/studio/…`
- [ ] 1.2 Update `client-games/src/components/NavBar.tsx` to a two-tab bar (Games | Studio, 50/50), preserving active-state styling and `--sab` padding; add a Studio (tools/wrench) icon
- [ ] 1.3 Add a route/nav test: `/studio` renders under auth and redirects to login when unauthenticated; both tabs render and reflect the active route; nav hidden on `/game/…`, shown on `/studio/…`

## 2. Studio home (generic hub)

- [ ] 2.1 Add `StudioHomePage` driven by a `STUDIO_GAMES` list (`{ slug, name, hubPath }`); render a card per game linking to its hub
- [ ] 2.2 Register Dungeon Tactics in `STUDIO_GAMES` → `/studio/dungeon-tactics`

## 3. Dungeon Tactics studio hub

- [ ] 3.1 Add `DungeonTacticsStudioPage` driven by a tools list (`{ label, path, status }`) with `status: 'available' | 'coming-soon'`
- [ ] 3.2 List the Unit Designer (`available`, → `/studio/dungeon-tactics/unit-designer`) and the Map editor (`coming-soon`, disabled)

## 4. Unit Designer (relocated ScenarioEditor)

- [ ] 4.1 Assess whether `ScenarioEditor.tsx` can mount standalone (outside the game scene); if coupled, extract its def-editing form + `defStore` wiring into a shared presentational component used by both the in-game panel and the studio page
- [ ] 4.2 Add `UnitDesignerPage` at `/studio/dungeon-tactics/unit-designer` that mounts the (possibly extracted) editor, editing the same unit defs (savable as the same Variants) via `defStore` + existing `/scenarios/:s/unit-defs` endpoints — no new persistence
- [ ] 4.3 Confirm the in-game `ScenarioEditor` panel still works unchanged (live tuning during a match)
- [ ] 4.4 Add/extend a test: studio edits persist through the existing endpoints and are reflected on reload

## 5. In-game HUD → ReactDOM

- [ ] 5.1 Add a ReactDOM HUD overlay in `DungeonTacticsGame.tsx`, positioned over the Phaser canvas, that renders the Done / Reset / Undo controls and the confirm modal as HTML; subscribe to the existing scene state/`hud-*` events and call back into the scene for actions
- [ ] 5.2 Remove the Phaser-drawn HUD from `DungeonTacticsScene.ts` — the `drawHud()` controls, their screen-space hit regions, and the dedicated HUD UI camera / `uiLayer` once nothing draws to it
- [ ] 5.3 Preserve input precedence: the overlay sits above the canvas and stops propagation so board taps under HUD controls aren't double-handled; verify placement-done / undo / reset / confirm during a match
- [ ] 5.4 Confirm no remaining HUD/chrome is painted into the canvas (world-space board/units/overlays stay in Phaser)

## 6. Docs + build

- [ ] 6.1 Note the new `/studio` design section in `llm-context.md` (new feature area; no API change); note that DT HUD now renders in ReactDOM
- [ ] 6.2 Run `npm run build:games`; confirm zero TypeScript errors
- [ ] 6.3 Verify existing and new tests pass
