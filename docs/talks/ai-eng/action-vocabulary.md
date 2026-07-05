# Action Vocabulary

**What this is.** The single, growing list of the Director's action vocabulary — the discrete, named things an authored script can tell the engine to do (the `Action` union from `requirements.md` §5 and `architecture.md`'s Director/Scene structure). `requirements.md` links here instead of carrying the full list itself, since the vocabulary grows every phase and shouldn't be duplicated in two places.

**Status legend:**
- **Established** — already part of the `Action` type in `architecture.md` / `client-talks/src/talk-rpg/script.ts`.
- **Proposed** — implied by a capability in `requirements.md` §4 or a narrative idea in `idea-board.md` / `script.md`, but not yet added to the `Action` type. Shape sketches here are a starting point for whoever formalizes them, not a locked API.

When an action moves from Proposed to Established (or gets renamed/dropped), update this doc in the same change — this is the intended single source of truth going forward.

---

## Established actions

As shipped by Phase 1 (`director-precompute-pass`), Phase 2
(`world-rendering-integration`), Phase 3 (`text-ui-overlay`), Phase 4
(`scripted-battle`), Phase 5 (`meters-and-light-radius`), Phase 6
(`party-and-stats`), and Phase 7 (`meta-shell-flourishes`) in
`client-talks/src/talk-rpg/script.ts`.
`startDialogue`/`say`/`endDialogue` still carry no choice-text field on
`endDialogue`, and dialogue/overlay content is a single active-UI slot rather
than per-NPC state — sufficient for this phase's own non-goals but something
later phases (multi-NPC dialogue) will need to extend.

| Action | Example | Notes |
|---|---|---|
| `walk` | walk entity `pc` along `[{direction:'down',steps:1}, {direction:'right',steps:10}]` | literal relative path |
| `walkTo` | walk entity `pc` to location `"shrine"` | A*-pathfound on the fixed map |
| `enterScene` | enter `"world-overworld"` at `"town-gate"` | scene/area switch |
| `startDialogue` | opens the dialogue box | optional `speaker` field; no NPC/entity reference otherwise — one global dialogue state |
| `say` | *"I heard we don't need warriors anymore…"* | one dialogue line; box already open; optional `speaker` field (falls back to the currently-open speaker if omitted) |
| `pause` | wait 3s | no presenter input; a beat for reading/breathing |
| `stop` | — | **the only presenter-visible checkpoint** — playback freezes here until `next()`; this is what the precompute pass snapshots |
| `endDialogue` | closes the dialogue box | no choice-text field yet |
| `thought` | PC thinks: *"I guess I'll go try a familiar."* | thought-bubble variant of the dialogue slot, anchored to `entity` via `useWorldAnchor` (the entity id is carried in `ui.speaker`) |
| `showMenu` | opens a command window with options `['Fight', 'Spell', 'Run']` | `menuKind: 'command'` only — the status screen is opened via `showStatus`, not `showMenu`; replaces any open dialogue; `selectedIndex` starts at 0 |
| `selectMenuOption` | moves the highlight to index `1` | on-rails only — no real input handling; no-op if no menu is open |
| `hideMenu` | closes the menu | works for either menu variant (`command` or `status`) |
| `showOverlay` | shows a full-screen headline card | `kind: 'act-card' \| 'headline' \| 'title'`; independent of the dialogue/menu slot |
| `hideOverlay` | clears the text card | pairs with `showOverlay`; independent of the dialogue/menu slot |
| `startBattle` | enter battle with allies `pc` (20/20 HP), `familiar` (14/14 HP) against enemy `slime` (12/12 HP) | switches scene to the single reusable `'battle'` arena, places one to several allies and one or more enemies at fixed slots (`allySlot0`/`1`/`2`/`3`, `enemySlot0`/`1`/`2`; allies face `left`, enemies face `right`), initializes `RestingState.battle` (`allies: PartyMemberState[]`, each defaulting to `tag: 'in'`), and plays an encounter flash on live entry only; `allies`/`enemies` carry explicit `CombatantHp` since no persistent entity/stats model exists — see `showStatus` |
| `endBattle` | outcome `'victory'` | clears `battle` to `null`; does **not** restore the prior scene/position — an explicit `enterScene` must follow, like every other scene change |
| `battleAction` | `pc` attacks `slime` for 7 damage | `kind: 'attack' \| 'spell' \| 'item' \| 'wrong-action'`; `damage` is a **signed** HP delta subtracted from `target`'s HP (clamped to `[0, maxHp]`) — negative heals, which is how `wrong-action` depicts a scripted mistake (e.g. Fire healing a fire-immune enemy); `text` is the authored narration line, shown via the same dialogue-box slot `say` uses; applies uniformly across `battle.allies` and `battle.enemies` |
| `defeatSequence` | *"THOU ART DEAD"* | full-screen defeat card via `overlay`'s `'defeat'` kind — the same mechanism as `showOverlay`/`hideOverlay`, distinct from `endBattle`'s outcome tagging |
| `tagCombatant` | tag `familiar` `'out'` | sets a named ally's choreography tag (`'in' \| 'out' \| 'needs-attention'`) in `battle.allies`; a no-op if no battle is active or the entity isn't an ally in the current battle; enemies never carry a tag |
| `partyJoin` | `familiar` joins at named location `'shrine'` | adds a new entity to `world.entities` at an authored named location (or, when `at` is omitted, the protagonist's current position); plays a one-shot join effect on live playback only, never replayed on `snapTo`/`back`/`skipTo`; does **not** itself place the entity into battle — a subsequent `startBattle` authors participants explicitly; an authoring convention for genuinely new recruits only, not for entities already present (e.g. previously `tagCombatant('out')`) |
| `showStatus` | open `pc`'s status screen: level `3`, role `'Warrior'`, `14/20` HP | opens the status screen with a real, authored `stats: EntityStats` payload (`level`, optional `role`, `hp`, `maxHp`) for `entity`; replaces `showMenu`'s old `menuKind: 'status'` variant; optional `options` renders a footer command list identically to the command window; stats are authored per-call, not a persistent record — two `showStatus` calls for the same entity may show different values with nothing keeping them in sync |
| `levelUp` | *"PC learned Radiant!"* | fanfare narration beat; reuses the dialogue-box slot exactly like `say`/`battleAction`'s narration; does not itself mutate any stat value — any stat change it represents is authored directly into a subsequent `showStatus` call; no dedicated fanfare animation in this phase |
| `setMeter` | define a `style: 'counter'` `gold` meter at `value: 0` | fully defines or replaces `meters[meterId]`'s descriptor + value in one step; `max` required for `style: 'bar'`; `anchorEntity` world-anchors it (à la `BattleHud`'s HP label), omitted renders at a fixed HUD position — covers the gold/cost counter as an ordinary meter instance, no separate action type |
| `addMeter` | `gold` +5 | ticks an existing meter's `value` by a signed `delta` (clamped to `[0, max]` for `style: 'bar'`); a no-op if `meterId` hasn't been `setMeter`'d yet |
| `setLightRadius` | radius `3` around `pc` over `2`s | sets `RestingState.lightRadius` to the authored final `{ anchorEntity, radius }` instantly in precompute (matching `walk`'s instant-final-position semantics); live playback animates in discrete integer steps via `LightRadiusExecutor` when `overSeconds` is set and the radius changes, otherwise applies instantly; `null` means full visibility, `radius: 0` fully extinguishes |
| `showSaveFile` | shows the "completed, high-level prior playthrough" summary + "enhanced edition available" prompt | sets `overlay` to a distinct `'save-file'` kind — the same mechanism as `showOverlay`/`hideOverlay`, cleared by the existing `hideOverlay` action; no separate `hideSaveFile` action exists |
| `showAchievement` | *"Thou Hast…"* toast pops | sets an independent `RestingState.achievement` field to `{ text }`; independent of `ui`/`overlay`, so a toast can display alongside an active dialogue, menu, or overlay card without displacing it |
| `hideAchievement` | dismisses the toast | unconditionally clears `achievement` to `null`, matching `hideOverlay`'s unconditional-clear precedent |

```ts
type Direction = 'up' | 'down' | 'left' | 'right'

interface RelativeStep {
  direction: Direction
  steps: number
}

interface CombatantHp {
  id: string
  hp: number
  maxHp: number
}

interface EntityStats {
  level: number
  role?: string
  hp: number
  maxHp: number
}

type Action =
  | { type: 'walk'; entity: string; path: RelativeStep[] }
  | { type: 'walkTo'; entity: string; target: string }
  | { type: 'enterScene'; scene: string; at?: string }
  | { type: 'pause'; seconds: number }
  | { type: 'stop' }
  | { type: 'startDialogue'; speaker?: string }
  | { type: 'say'; text: string; speaker?: string }
  | { type: 'endDialogue' }
  | { type: 'thought'; entity: string; text: string }
  | { type: 'showMenu'; menuKind: 'command'; options: string[] }
  | { type: 'selectMenuOption'; index: number }
  | { type: 'hideMenu' }
  | { type: 'showOverlay'; kind: 'act-card' | 'headline' | 'title'; text: string }
  | { type: 'hideOverlay' }
  | { type: 'startBattle'; allies: CombatantHp[]; enemies: CombatantHp[]; surprised?: 'party' | 'enemy' }
  | { type: 'endBattle'; outcome: 'victory' | 'defeat' | 'flee' | 'stalemate' }
  | { type: 'battleAction'; actor: string; target: string; kind: 'attack' | 'spell' | 'item' | 'wrong-action'; damage: number; text: string }
  | { type: 'defeatSequence'; text: string }
  | { type: 'tagCombatant'; entity: string; action: 'in' | 'out' | 'needs-attention' }
  | { type: 'partyJoin'; entity: string; at?: string; fx?: string }
  | { type: 'setMeter'; meterId: string; label: string; style: 'bar' | 'counter'; value: number; max?: number; anchorEntity?: string }
  | { type: 'addMeter'; meterId: string; delta: number }
  | { type: 'setLightRadius'; anchorEntity: string; radius: number; overSeconds?: number }
  | { type: 'showStatus'; entity: string; stats: EntityStats; options?: string[] }
  | { type: 'levelUp'; entity: string; text: string }
  | { type: 'showSaveFile'; summary: string }
  | { type: 'showAchievement'; text: string }
  | { type: 'hideAchievement' }
```

---

## Proposed actions

Grouped by the capability areas in `requirements.md` §4. Each entry names the requirement/idea it comes from so it can be traced back if the shape needs revisiting.

### Camera & scene transitions (requirements §4A/§4B)

| Action | Shape sketch | Source |
|---|---|---|
| `panCamera` | `{ type: 'panCamera'; x; y; zoom; overSeconds? }` — real camera motion, executed like `walk` (not a generic tween) | §4B "Camera control"; script.md beat 4 `overworld-reveal` (camera pans out as the map is revealed) |
| `transitionScene` | `{ type: 'transitionScene'; style: 'flash' \| 'wipe'; to: string }` | §4B "Scene & encounter transitions"; script.md beats 5a (`battle-slime-start`), 7a (`party-joins`); idea-board §9 "Encounter transition" (authentic-understated vs. punchier flash — still a [FORK]) |

### Dialogue & UI overlay (requirements §4C)

| Action | Shape sketch | Source |
|---|---|---|
| `typeText` | `{ type: 'typeText'; target: string; text: string }` — character-by-character reveal, distinct from `say`'s dialogue-box reveal | script.md beat 1 `name-entry` ("J", "O", "N" typed one at a time, then `CONFIRM`) |

`showMenu`'s established shape only supports `menuKind: 'command'` (the status screen is opened via `showStatus` instead) — a `'class-select'` variant (idea-board §4, §9 DW3 class-change shrine) remains proposed; see "Not yet action-shaped" below.

### Scripted battle (requirements §4D, §4E)

`startBattle`/`endBattle`/`battleAction`/`defeatSequence` (`scripted-battle`,
Phase 4), and `partyJoin`/`tagCombatant`/`showStatus`/`levelUp`
(`party-and-stats`, Phase 6) are now Established above — `startBattle` scaled
from a single ally to one-to-several, with multi-combatant choreography
(`tagCombatant`) and roster growth (`partyJoin`) fully covered.

`setMeter`/`addMeter` (§4F "Attachable scriptable meters"/"Cost / currency
counter") and `setLightRadius` (§4G "Scriptable light radius / fog") are now
Established above (`meters-and-light-radius`, Phase 5).

`showSaveFile`/`showAchievement`/`hideAchievement` (§4H "Meta-shell &
flourishes") are now Established above (`meta-shell-flourishes`, Phase 7).

---

## Not yet action-shaped (flagged, not sketched)

These are real capabilities or ideas that will need action(s) eventually but aren't specific enough yet to sketch a shape:

- **Class-change / job-select screen** as its own interactive-looking sequence, beyond the generic `showMenu(kind: 'class-select')` sketch above (idea-board §4, §9 DW3 class-change shrine).
- **Encounter-transition style** is an open `[FORK, minor]` in idea-board §9 — `transitionScene`'s `style` field should get a real enum once that's resolved, not before.
- **Achievement-to-death-mechanic pairing** — idea-board §8 notes the death achievement's text must match whichever context-failure mechanic (clear vs. compaction) is ultimately chosen; no new action needed, just correct `text` content once that fork resolves.
