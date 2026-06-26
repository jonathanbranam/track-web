## 1. Studio route area + nav tab

- [x] 1.1 Add `/studio` and `/studio/dungeon-tactics` routes in `client-games/src/App.tsx` under `AuthGuard`; confirm the existing `inGame` test (`/^\/game\//`) leaves the nav visible on `/studio/…`
- [x] 1.2 Update `client-games/src/components/NavBar.tsx` to a two-tab bar (Games | Studio, 50/50), preserving active-state styling and `--sab` padding; add a Studio (tools/wrench) icon
- [x] 1.3 Add a route/nav test: `/studio` renders under auth and redirects to login when unauthenticated; both tabs render and reflect the active route; nav hidden on `/game/…`, shown on `/studio/…`

## 2. Studio home (generic hub)

- [x] 2.1 Add `StudioHomePage` driven by a `STUDIO_GAMES` list (`{ slug, name, hubPath }`); render a card per game linking to its hub
- [x] 2.2 Register Dungeon Tactics in `STUDIO_GAMES` → `/studio/dungeon-tactics`

## 3. Dungeon Tactics studio hub

- [x] 3.1 Add `DungeonTacticsStudioPage` driven by a tools list (`{ label, path, status }`) with `status: 'available' | 'coming-soon'`
- [x] 3.2 List the Unit Designer (`available`, → `/studio/dungeon-tactics/unit-designer`) and the Map editor (`coming-soon`, disabled)

## 4. Unit Designer (relocated ScenarioEditor)

- [x] 4.1 Assess whether `ScenarioEditor.tsx` can mount standalone (outside the game scene); if coupled, extract its def-editing form + `defStore` wiring into a shared presentational component used by both the in-game panel and the studio page
- [x] 4.2 Add `UnitDesignerPage` at `/studio/dungeon-tactics/unit-designer` that mounts the (possibly extracted) editor, editing the same unit defs (savable as the same Variants) via `defStore` + existing `/scenarios/:s/unit-defs` endpoints — no new persistence
- [x] 4.3 Confirm the in-game `ScenarioEditor` panel still works unchanged (live tuning during a match)
- [x] 4.4 Keep all Unit Designer / studio chrome (controls, panels, modals) in ReactDOM, consistent with the established `dungeon-tactics-react-hud` precedent — no Phaser-drawn HUD chrome is introduced
- [x] 4.5 Add/extend a test: studio edits persist through the existing endpoints and are reflected on reload

## 5. Docs + build

- [x] 5.1 Note the new `/studio` design section in `llm-context.md` (new feature area; no API change)
- [x] 5.2 Run `npm run build:games`; confirm zero TypeScript errors
- [x] 5.3 Verify existing and new tests pass
