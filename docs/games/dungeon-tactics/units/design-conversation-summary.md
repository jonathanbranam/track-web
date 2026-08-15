# Dungeon Tactics Unit Design — Conversation Summary

This document captures the major threads, pivots, and decisions from a design conversation about the Dungeon Tactics unit framework. It is meant as a reference so any of the explored directions can be revisited later.

---

## 1. Starting point: the new unit design documents

The existing design lives in `docs/games/dungeon-tactics/units/`:

- `new-unit-design.md` — high-level redesign goal: PCs should have flexible, interleaved move/action turns instead of the old move-then-attack model.
- `unit-definition.md` — the concrete proposal: a **shared action shell** plus **archetype rulesets** (`brute`, `fighter`, `rogue`, `ranger`, `mage`). Code owns the turn rules; data owns the values.
- `attack.md` and `movement.md` — the composable targeting/propagation/effect and pathing systems, largely unchanged.
- `archetype-concepts.md` — exploratory brainstorming about how each PC archetype should *feel* (Anchor, Berserker, Rogue, Ranger, Mage).
- `mage-concepts.md` — deep exploration of a zero-direct-damage Mage build.
- `terrain.md` and `content_model.md` — terrain/biome design and the Region/Map/Encounter content model.

The codebase is at **Stage 2** of the old unit framework plan: unit definitions are already persisted in SQLite (`game_scenarios` / `game_unit_defs`) and editable live via an in-game panel. The old framework is archived under `docs/games/dungeon-tactics/archive/`.

**Key insight:** the new design is primarily a **turn-structure redesign**, not a replacement of the movement/attack engine. The engine primitives (targeting, propagation, effects, pathing) stay the same; what changes is how many moves/actions a unit can take and in what order.

---

## 2. First proposed direction: implement the data-driven archetype model

The initial recommendation was to implement the design as documented:

- Update the `UnitDef` schema to carry `archetype`, `params`, and `actions[]`.
- Implement the archetype rulesets in code (`brute`, `fighter`, `rogue`, `ranger`, `mage`).
- Migrate the existing 4 PCs + NPCs onto the new archetypes.
- Update the live editor to edit actions, not just stats.
- Rename `Scenario` → `Variant` in code/DB as part of the schema migration.

**Suggested conservative scope:** implement only the archetypes that are fully expressible today (`brute`, `fighter`, `mage`) and defer `rogue`, `ranger`, status-dependent Fighter abilities, and the Anchor/Berserker split.

**Open blockers identified:**
- Status system is needed for Fighter `raging`, `enrage`, `taunt`, and many Mage/Rogue setup conditions.
- New terrain types (`wall`, `obscuring_fog`) are referenced by Mage spells but not fully defined.
- Action-embedded movement semantics (e.g., when exactly a `charge` moves relative to its attack) need pinning down.
- Ranger ammo-rotation state needs a runtime home.
- Anchor vs. Berserker split is still exploratory.

---

## 3. Pivot: concern about flexibility and experimentation

The designer raised a concern: the archetypes will likely change a lot, so a pure data-driven approach may be too rigid. They considered combining the existing data-driven system with **custom scripting support** for each unit.

### 3.1 The scripting/VM proposal

Idea: define a limited API surface that a unit script can use to implement its archetype. The script would control:
- How many and which actions can be taken and in what order.
- Queries like "can the unit move?" or "list available actions".
- Hooks to update UI elements and rendering.
- Storage of novel per-unit data elements.

The designer imagined using an LLM to write these scripts, with the designer never reading/writing script code directly. Hot-reload or VM execution would make iteration fast.

### 3.2 Analysis of the scripting approach

**What a scripting API would need to provide:**
1. **Runtime state storage** — per-unit archetype-private state (mana, movement pool, ammo index, fury, stance, etc.) that serializes with the game save.
2. **Turn-phase hooks** — `onTurnStart`, `getAvailableActions`, `canMove`, `onActionSelected`, `onTurnEnd`, `onDamaged`, etc.
3. **Action resolution API** — `moveUnit`, `dealDamage`, `applyStatus`, `createTerrain`, `pushUnit`, `endTurn`, etc.
4. **UI control API** — `highlightTiles`, `showActionMenu`, `showConfirmButton`, etc.
5. **Query API** — `getUnitAt`, `getUnitsInRadius`, `getTerrain`, `hasLineOfSight`, etc.

**Costs identified:**
- Determinism and state capture are hard (needed for undo, save/load, replay, multiplayer sync).
- Security sandbox required.
- Custom debugging/logging needed.
- Significant implementation complexity.
- The t4g.micro production host is resource-constrained.
- LLM-generated script debugging becomes opaque: generated code inside a VM is hard to explain and fix.

**Conclusion:** full scripting is poor ROI for the current stage. The experimentation the designer wants is mostly turn-feel tuning, which is a number/sequence change, not a logic-change problem that requires a VM.

---

## 4. Counter-proposal: pluggable archetype modules (TypeScript)

As a lighter alternative, we discussed moving archetype logic out of hardcoded `pc.ts` branches into **pluggable TypeScript modules** registered by ID.

```
┌────────────┐      ┌─────────────────────┐      ┌──────────┐
│  UnitDef   │─────▶│  archetype registry │─────▶│ GameState│
│  (JSON)    │      │  (fighter.ts,       │      │          │
│            │      │   rogue.ts, etc.)   │      │          │
└────────────┘      └─────────────────────┘      └──────────┘
n```

**Benefits:**
- Type-safe, debuggable, testable.
- No VM/sandbox/determinism tax.
- New archetypes can be added as files without touching core engine.
- LLM can generate archetype modules from prompts; designer never edits code.
- Leaves the door open to full scripting later (the registry is the seam).

**Preparation work needed:**
1. Define a stable `Archetype` interface.
2. Extract per-archetype state into a serializable `TurnState`.
3. Build a scenario-level test harness.
4. Separate action resolution from turn flow.

**Recommended first spec:** "Dungeon Tactics — archetype registry and turn-state refactor." This is a pure refactor with no gameplay change, but it creates the seam where new archetypes land.

---

## 5. Stronger synthesis: scenario-driven unit specification

The conversation then pivoted to a more powerful idea: instead of dictating implementation (data or code), let the designer specify unit behavior through **scenarios**.

### 5.1 Core concept

A scenario is an executable specification:

```
Given: board state + units
When:  event(s) happen
Then:  expected outcomes
```

Scenarios serve two purposes:
1. **Constraint/prompt for the LLM** when writing implementation.
2. **Acceptance tests** that verify the implementation behaves as specified.

The LLM interviews the designer to fill gaps:
- Designer: "a unit that intentionally gets itself killed because then it spawns clones"
- LLM: "How does the unit take damage? Can it bait an attack or cause self-damage? Where do clones spawn? Do clones also spawn clones? How does spawning end?"

### 5.2 Scenario format

Proposed structured YAML/JSON format:

```yaml
unit: sacrificial-clone
scenarios:
  - id: lethal-environment-damage
    given:
      board:
        cols: 8
        rows: 8
        terrain: [...]
      units:
        - id: pc-0
          kind: pc
          archetype: sacrificial-clone
          col: 2
          row: 2
          hp: 1
    steps:
      - description: The unit takes 1 fire damage.
        event:
          kind: dealDamage
          target: pc-0
          amount: 1
          type: fire
    then:
      - kind: unitRemoved
        unitId: pc-0
      - kind: unitExists
        id: clone-0
        archetype: sacrificial-clone
        hp: 1
        near: { ref: pc-0, distance: 1 }
```

### 5.3 Assertion vocabulary

A small, extensible set:
- `unitExists` / `unitRemoved`
- `unitCount`
- `unitAt`
- `statusApplied`
- `terrainIs`
- `noEvent` / composite negatives

### 5.4 Scenario runner architecture

```
scenario/
├── scenario.ts    # Types
├── parser.ts      # YAML/JSON → typed Scenario
├── runner.ts      # Given + steps → GameState sequence
├── assertions.ts  # Evaluate expectations
└── events/        # Map scenario events to engine calls
```

The runner is deliberately thin. It calls existing engine functions rather than reimplementing rules, so scenarios stay honest when the engine changes.

---

## 6. Visual scenario reviewer and live-editing vision

The designer wants a **scenario reviewer** UI where they can click through scenarios step by step and watch the board state evolve. This turns abstract specs into something visible and debuggable.

### 6.1 MVP reviewer

- Studio route: `/studio/dungeon-tactics/scenarios/:scenarioId`.
- Phaser `ScenarioScene` renders `GameState` using existing `drawBoard()` plus unit markers.
- Right pane shows scenario text and current step.
- Controls: Prev / Next / Play.
- Failed expectations highlighted in red on the final state.

### 6.2 Reusable existing pieces

| Existing piece | Use in reviewer |
|---|---|
| `boardRender.ts` → `drawBoard()` | Terrain + structures |
| `EditorScene.ts` | Pattern for data-driven Phaser scene |
| `GameState` type | Canonical state to render |
| `pc.ts` / `npc.ts` / `turn.ts` | Pure functions to apply events |
| `defStore.ts` / `unitDefs.ts` | Archetype data |

### 6.3 Future live-editing phases

**Phase 1 (now):** Text scenarios + reviewer. Designer writes/prompts scenarios in YAML; reviewer visualizes them; agent implements from scenarios.

**Phase 2:** Interactive scenario builder. Designer edits the "Given" board visually (like the map editor), places units, sets HP, adds statuses.

**Phase 3:** Playtest capture. Designer enters a scratch scenario, plays the unit manually in a sandbox, system records actions as scenario steps; designer trims/approves.

**Phase 4:** Spec-driven iteration. Designer edits a scenario; agent regenerates archetype implementation; reviewer verifies immediately.

**Key insight:** scenarios become the stable interface between designer and code. The UI is just a friendly way to produce them.

---

## 7. Open strategic decisions

### 7.1 Scenario storage: source code vs. runtime data

- **Source code (recommended for MVP):** scenarios checked into repo as part of the OpenSpec change; reviewer loads from disk during dev. Simple, version-controlled, works with the agent workflow.
- **Runtime data:** scenarios stored in DB, editable in UI. Better for Phase 3/4 but requires API + persistence.

### 7.2 In-browser authoring vs. type-safe modules

- In-browser authoring essential → eventually need scripting or a rich visual DSL.
- Fast, safe iteration with tests acceptable → pluggable TS modules + scenario runner is the better bet.

### 7.3 Scope of first implementation change

Three options were framed:

| Option | Description | Pros | Cons |
|---|---|---|---|
| A | Build scenario runner first, then use it for new unit framework. | Reusable foundation; low risk. | No immediate new archetype. |
| B | Pick one new archetype (e.g., `mage`) and use it to drive scenario runner design. | Concrete goal; immediate playable result. | Runner may be overfit to one archetype. |
| C | Spec full scenario-driven workflow (LLM interview + editor + runner + code gen). | Vision complete. | Large; many untested assumptions. |

**Recommended:** Option B — pick `mage` (mana + teleport + terrain spells) as the first scenario-driven archetype. It is complex enough to stress-test the runner and well-defined in the docs.

---

## 8. Recommended next steps

1. **Create an OpenSpec change:** "Dungeon Tactics — scenario-driven unit specification and visual reviewer."
2. **Scope:** define scenario schema, build runner + assertions, build `ScenarioScene` and Studio route, port 2–3 existing tests to scenario format, write one new archetype scenario (e.g., `mage`).
3. **Keep out of scope for first change:** LLM interview workflow, interactive scenario builder, playtest capture, backend persistence of scenarios.
4. **After the reviewer works:** layer on the archetype registry refactor so new archetypes can be implemented from scenarios.
5. **Only after those foundations are solid:** consider whether a scripting/VM layer is actually needed, or if pluggable modules + scenarios already provide enough experimentation speed.

---

## 9. Key takeaways

- The new unit design is about **turn structure**, not replacing movement/attack primitives.
- A pure data-driven archetype model is documented but has unresolved dependencies (status system, terrain types, action-embedded movement semantics).
- Full scripting/VM is flexible but high-cost and poor ROI at this stage; the real experimentation need is turn-feel tuning, not arbitrary logic.
- **Pluggable TypeScript archetype modules** are the sweet spot: type-safe, testable, LLM-generatable, and a natural stepping stone.
- **Scenario-driven specification** is the strongest synthesis: scenarios constrain the LLM, serve as acceptance tests, and can be visualized in a reviewer.
- The visual scenario reviewer should reuse existing rendering (`drawBoard`, `EditorScene` pattern) and existing game-state functions.
- Scenarios should start as **source-code artifacts** (YAML in the change directory), not runtime DB data.
- The first implementation should pick **one concrete archetype** (e.g., `mage`) to drive the design, not try to build the whole workflow at once.