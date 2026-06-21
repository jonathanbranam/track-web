## Context

The games app (`client-games/`) has a flat games registry (`src/games/registry.ts`) and a single dynamic route `/game/:slug` that mounts whichever component a registry entry names. The current "Prototypes" entry directly mounts `PrototypesGame.tsx`, which hard-codes a single prototype (TiltTester) with no picker. There is no sub-routing beneath `/game/:slug`.

The existing `PhaserGame` React component (`src/games/PhaserGame.tsx`) is a generic Phaser host: it accepts a `buildConfig` factory and an `onGameReady` callback, creates `Phaser.Game` on mount, and destroys it on unmount. `BallMergeGame` follows this pattern (React wrapper + a Phaser `Scene` class). The grid rendering prototype will follow the same pattern.

`AppShell` in `App.tsx` uses `/^\/game\/[^/]+$/` to detect "in-game" state (hides nav bar, removes scroll). This regex does not match prototype sub-routes like `/game/prototypes/tilt-tester`.

---

## Goals / Non-Goals

**Goals:**
- Move the `prototypes` registry entry to the end of the games list.
- Introduce a prototype picker page at `/game/prototypes` listing all available prototypes.
- Route `/game/prototypes/:protoSlug` to individual prototype components with the same game-page chrome (back link, title, full-screen content).
- Add a `grid-rendering` prototype that demonstrates a minimal turn-based tactical game loop in Phaser.
- Keep the game model for the grid prototype free of Phaser dependencies so it is portable and testable.

**Non-Goals:**
- Persistent save state for any prototype.
- NPC AI beyond the fixed march-toward-exit behavior specified in the proposal.
- Real sprite assets — Phaser Graphics primitives only.
- Any backend changes.

---

## Decisions

### 1. Routing: explicit prototype routes, not slug detection in GamePage

**Options:**
- A. Detect `slug === 'prototypes'` inside `GamePage` and branch to a picker.
- B. Add explicit React Router routes — `/game/prototypes` (picker) and `/game/prototypes/:protoSlug` (individual prototype) — before the existing `/game/:slug` route.

**Decision: B.** React Router v7 resolves static segments before dynamic ones, so `/game/prototypes` and `/game/prototypes/:protoSlug` win over `/game/:slug` without any changes to `GamePage`. The routes are added in `App.tsx`. `GamePage` remains generic and untouched. The `prototypes` registry entry keeps `mount` undefined; the home page card still navigates to `/game/prototypes` (same URL, now served by the new route).

The `inGame` regex in `AppShell` is broadened to `/^\/game\//.test(location.pathname)` so all prototype sub-routes also hide the nav bar.

---

### 2. Prototype sub-registry

A small `src/games/prototypes/registry.ts` exports a typed array of prototype entries:

```ts
interface PrototypeEntry {
  slug: string
  name: string
  description: string
  mount: LazyExoticComponent<ComponentType>
}
```

The picker page imports and renders this list. Adding a new prototype = one registry entry + one new folder. Removing one = delete the entry and folder. `PrototypesGame.tsx` is replaced by `PrototypesPickerPage.tsx` which reads from this registry.

---

### 3. Grid game model — pure TypeScript, Phaser-agnostic

All game state and rules live in `src/games/prototypes/grid-rendering/GridModel.ts`. Phaser is never imported there.

**Core types:**
```ts
type TerrainType = 'plains' | 'forest' | 'water' | 'stone'
type UnitKind    = 'pc' | 'npc'
type Direction   = 'up' | 'down' | 'left' | 'right'

interface Cell { terrain: TerrainType; hasStructure: boolean }

interface PcPlan {
  moveTarget?: { col: number; row: number }   // planned destination (empty square)
  attackDir?: Direction                        // cardinal direction to attack from post-move position
}

interface Unit { id: string; kind: UnitKind; col: number; row: number }

type PlanningPhase = 'none' | 'selecting-move' | 'selecting-attack'
type TurnPhase     = 'player' | 'pc-playback' | 'npc-playback'

interface GameState {
  cells: Cell[][]                    // [row][col], 4×4
  units: Unit[]
  phase: TurnPhase
  planningPhase: PlanningPhase       // sub-state during player phase
  selectedUnitId: string | null
  plans: Record<string, PcPlan>      // keyed by unit id; only PCs
  planOrder: string[]                // unit ids in the order plans were last assigned (drives playback order)
}
```

**Fixed map** — defined as a constant in `GridModel.ts`:

```
     col 0     col 1     col 2     col 3
row 0: forest   plains    water     stone    (NPC at 0,0 and 3,0)
row 1: plains   stone     forest    water    (NPC at 1,1 and 2,1)
row 2: stone    [S]plains [S]forest plains   (structures at 1,2 and 2,2)
row 3: plains   water     stone     forest   (PC at 0,3 and 3,3)
```

**Model methods** (all return new `GameState`, no mutation):
- `selectUnit(state, id)` → sets `selectedUnitId`, `planningPhase: 'none'`
- `beginPlanMove(state)` → `planningPhase: 'selecting-move'`
- `beginPlanAttack(state)` → `planningPhase: 'selecting-attack'`
- `setPlanMove(state, unitId, col, row)` → records `plans[unitId].moveTarget`, updates `planOrder`, clears selection sub-phase
- `setPlanAttack(state, unitId, dir)` → records `plans[unitId].attackDir`, updates `planOrder`, clears selection sub-phase
- `clearPlan(state, unitId)` → removes plan entry, removes from `planOrder`
- `cancelSelection(state)` → clears `selectedUnitId`, `planningPhase: 'none'`
- `endPlayerTurn(state)` → transitions `phase: 'pc-playback'`; computes and returns `PcAction[]` (in `planOrder` sequence) eagerly
- `resolvePcAction(state, action)` → applies one PC action, returns updated state
- `beginNpcPlayback(state)` → transitions `phase: 'npc-playback'`; computes and returns `NpcAction[]` eagerly
- `resolveNpcAction(state, action)` → applies one NPC action, returns updated state
- `endRound(state)` → clears all plans and `planOrder`, transitions `phase: 'player'`

**Valid move destinations** (used by scene to highlight tiles during `selecting-move`):
Orthogonal neighbours of the selected PC's current position that have no structure, no PC, and no NPC.

**Valid attack squares** (used by scene to highlight tiles during `selecting-attack`):
The 4 orthogonal neighbours of the PC's *planned destination* (or current position if no move planned). All 4 are always shown as selectable — attack direction is chosen regardless of what occupies the square.

**`PcAction` union** (computed by `endPlayerTurn`, consumed by the scene animator):
```ts
type PcAction =
  | { kind: 'move-attack'; unitId: string; fromCol: number; fromRow: number; toCol: number; toRow: number; attackDir: Direction }
  | { kind: 'move';        unitId: string; fromCol: number; fromRow: number; toCol: number; toRow: number }
  | { kind: 'attack';      unitId: string; col: number; row: number; attackDir: Direction }
  | { kind: 'stay';        unitId: string }
```

**PC move blocking:** `resolvePcAction` checks the destination at resolution time. If occupied, the PC's position is unchanged but `attackDir` (if present) is still applied from the PC's actual position.

**`NpcAction` union** (computed by `beginNpcPlayback`, consumed by the scene animator):
```ts
type NpcAction =
  | { kind: 'move';   unitId: string; fromCol: number; fromRow: number; toCol: number; toRow: number }
  | { kind: 'attack'; unitId: string; targetCol: number; targetRow: number }
  | { kind: 'exit';   unitId: string; fromCol: number; fromRow: number }
  | { kind: 'stay';   unitId: string }
```

NPC resolution order: if on row 3 → exit; else try move down; if blocked by structure/NPC → try left then right; if blocked by PC → attack; else stay.

---

### 4. Phaser scene and React wrapper

Follows the existing `BallMergeGame` pattern:

- `GridRenderingGame.tsx` — React wrapper; holds `GameState` in `useRef` (mutated via model functions); renders `PhaserGame` plus a React HUD overlay (action menu + Done button).
- `GridScene.ts` — `Phaser.Scene`; responsible only for rendering and input. It reads state from a shared ref, redraws on state changes, and emits typed events for React to handle.

**Communication React → Scene:** React calls a scene method (e.g. `scene.highlightMoves(cells)`) exposed via the `onGameReady` callback ref.

**Communication Scene → React:** Scene emits events on `this.game.events`:
- `'unit-tapped'` `{ unitId }` — user tapped a unit
- `'cell-tapped'` `{ col, row }` — user tapped a cell (during move/attack phase)

React handles these events to call model functions and re-render the HUD.

---

### 5. Action menu as a React overlay

**Options:**
- A. Phaser-native menu (Graphics + Text objects in the scene).
- B. React overlay div positioned over the Phaser canvas.

**Decision: B.** The action menu ("Move", "Attack", "Cancel") and the "Done" button are pure React, styled with Tailwind. The `PhaserGame` container div is `position: relative`; the HUD overlay is `position: absolute inset-0 pointer-events-none` with individual interactive elements having `pointer-events-auto`. This matches the existing Ball Merge HUD pattern in `TiltTester.tsx`.

The menu appears at the bottom of the screen (not near the tile) to avoid obscuring the small 4×4 grid.

---

### 6. Playback animation sequencing

There are two sequential playback phases after "Done". Both use the same recursive tween-chain pattern. Player input is blocked throughout (React renders no interactive buttons while `phase !== 'player'`).

**PC playback** (`endPlayerTurn` returns `PcAction[]`):

```
animatePcNext(index):
  if index >= pcActions.length → dispatch 'pc-playback-complete'
                               → React calls beginNpcPlayback, receives NpcAction[]
                               → animateNpcNext(0)
  action = pcActions[index]
  play tween(s) for action:
    move: tween PC sprite to destination (~400ms); on complete, call resolvePcAction, redraw
    attack: after move completes, flash attack-direction square (~250ms red tint)
  onComplete: call animatePcNext(index + 1)
```

Ghost sprites and plan arrows are cleared at the start of PC playback.

**NPC playback** (`beginNpcPlayback` returns `NpcAction[]`):

```
animateNpcNext(index):
  if index >= npcActions.length → dispatch 'npc-playback-complete' → React calls endRound
  action = npcActions[index]
  play tween for action (~400ms move, ~300ms attack flash, ~400ms exit off-bottom)
  onComplete: apply resolveNpcAction to model state, redraw, call animateNpcNext(index + 1)
```

For **exit** actions: tween the NPC sprite downward off the bottom edge (y += tileSize), then destroy the display object.

For **attack** actions (NPC→PC): flash both the attacker tile and the target PC tile with a red tint. No state change to the PC.

---

### 7. Planning visuals (ghost, arrows, highlights)

All planning visuals are drawn as Phaser Graphics objects on a dedicated overlay layer above the tile layer, redrawn on every state change.

- **Move arrow:** a line + arrowhead from the PC's current tile center to the planned destination tile center.
- **Ghost PC:** the PC's shape redrawn at the planned destination with reduced alpha (~0.4) and a dashed stroke. The real PC shape remains at the current position.
- **Attack indicator:** a small directional chevron or highlighted border on the attack-direction square, drawn relative to the planned destination (or current position if no move planned).
- **Move highlights (during `selecting-move`):** valid destination tiles get a colored border overlay.
- **Attack highlights (during `selecting-attack`):** all 4 orthogonal squares around the planned position get a colored border overlay regardless of occupancy.

All overlays are cleared at the start of PC playback.

---

### 8. Zoom and pan

Phaser camera:
- **Scroll wheel:** `this.input.on('wheel', (_, __, ___, deltaY) => camera.zoom -= deltaY * 0.001)`, clamped to `[0.5, 2.0]`.
- **Pinch:** track two active pointers; on each pointer move, compute distance delta; scale zoom proportionally.
- **Pan:** single-pointer drag on empty tiles moves the camera (`camera.scrollX/Y`). Tapping a unit/cell with no drag triggers selection. Distinguish by pointer travel distance (< 5px = tap).

---

## Risks / Trade-offs

- **4×4 is tiny at default zoom on desktop** — the map will look small. Mitigated by the zoom controls and by choosing a tile size (~80–96px) that fills a reasonable portion of the screen at 1×.
- **Phaser scene/React state sync complexity** — two state owners (model ref + Phaser display objects) can diverge. Mitigated by the rule that the scene never owns state: it only draws what it's told by the model, and re-renders fully on each state change (redrawAll pattern).
- **PC action computation is eager** — `PcAction[]` is computed at `endPlayerTurn` from current plans. Move blocking is re-checked at `resolvePcAction` time against live state, so a PC whose planned destination is taken by an earlier PC will correctly stay in place and still attack in the planned direction.
- **NPC action computation is eager** — computed at `beginNpcPlayback` after all PC actions have resolved, so NPC actions see the correct post-PC-playback map state. `resolveNpcAction` re-reads live state sequentially to handle chain effects correctly.
- **Ghost PC at planned destination** — the destination tile appears occupied visually during planning but is not truly occupied in the model until playback. Two PCs could plan to move to the same square; the second one will be blocked at playback. This is intentional and consistent with the "plan, then resolve" model.
- **inGame regex broadening** — `/^\/game\//` matches any `/game/...` path including future routes. Acceptable for now; revisit if a `/game/...` route should show the nav bar.

---

## Open Questions

- Should the prototype picker page reuse the `GamePage` back-link chrome, or get its own header? (Proposal implies same chrome — back to Games, title "Prototypes".)
- Tile size to use for the 4×4 grid — needs testing at actual screen sizes. Start at 80px and tune.
- Should "acted" PCs render with a visual indicator (e.g. desaturated) even though they can still be re-activated? Proposal says yes — a soft visual cue, not a lock.
