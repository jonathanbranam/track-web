# Action Vocabulary

**What this is.** The single, growing list of the Director's action vocabulary — the discrete, named things an authored script can tell the engine to do (the `Action` union from `requirements.md` §5 and `architecture.md`'s Director/Scene structure). `requirements.md` links here instead of carrying the full list itself, since the vocabulary grows every phase and shouldn't be duplicated in two places.

**Status legend:**
- **Established** — already part of the `Action` type in `architecture.md` / `client-talks/src/talk-rpg/script.ts`.
- **Proposed** — implied by a capability in `requirements.md` §4 or a narrative idea in `idea-board.md` / `script.md`, but not yet added to the `Action` type. Shape sketches here are a starting point for whoever formalizes them, not a locked API.

When an action moves from Proposed to Established (or gets renamed/dropped), update this doc in the same change — this is the intended single source of truth going forward.

---

## Established actions

As shipped by Phase 1 (`director-precompute-pass`) in
`client-talks/src/talk-rpg/script.ts`. This is a **simplified subset** of
what `architecture.md`'s original sketch and the table below once showed —
`walkTo`/`thought`/`enterScene` are not implemented yet (see "Proposed
actions" below; `walkTo`/`enterScene` are Phase 2 goals) and `startDialogue`/
`say`/`endDialogue` carry no NPC/speaker/choice reference yet — dialogue is
a single global open/closed + text state, sufficient for Phase 1's own
non-goals but something later phases (multi-NPC dialogue) will need to
extend.

| Action | Example | Notes |
|---|---|---|
| `walk` | walk entity `pc` along `[{direction:'down',steps:1}, {direction:'right',steps:10}]` | literal relative path |
| `startDialogue` | opens the dialogue box | no NPC reference yet — one global dialogue state |
| `say` | *"I heard we don't need warriors anymore…"* | one dialogue line; box already open; no speaker field yet |
| `pause` | wait 3s | no presenter input; a beat for reading/breathing |
| `stop` | — | **the only presenter-visible checkpoint** — playback freezes here until `next()`; this is what the precompute pass snapshots |
| `endDialogue` | closes the dialogue box | no choice-text field yet |

```ts
type Direction = 'up' | 'down' | 'left' | 'right'

interface RelativeStep {
  direction: Direction
  steps: number
}

type Action =
  | { type: 'walk'; entity: string; path: RelativeStep[] }
  | { type: 'pause'; seconds: number }
  | { type: 'stop' }
  | { type: 'startDialogue' }
  | { type: 'say'; text: string }
  | { type: 'endDialogue' }
```

---

## Proposed actions

Grouped by the capability areas in `requirements.md` §4. Each entry names the requirement/idea it comes from so it can be traced back if the shape needs revisiting.

### World movement & scene switching (requirements §4B) — Phase 2 goals

| Action | Shape sketch | Source |
|---|---|---|
| `walkTo` | `{ type: 'walkTo'; entity: string; target: string }` — A*-pathfound to a named map location on the fixed map; robust to minor map edits | §4B "Scripted path movement — literal or pathfound"; `phased-implementation.md` Phase 2 |
| `enterScene` | `{ type: 'enterScene'; scene: string; at?: string }` — scene/area switch | §4B "Scene / area management"; `phased-implementation.md` Phase 2 |

### Camera & scene transitions (requirements §4A/§4B)

| Action | Shape sketch | Source |
|---|---|---|
| `panCamera` | `{ type: 'panCamera'; x; y; zoom; overSeconds? }` — real camera motion, executed like `walk` (not a generic tween) | §4B "Camera control"; script.md beat 4 `overworld-reveal` (camera pans out as the map is revealed) |
| `transitionScene` | `{ type: 'transitionScene'; style: 'flash' \| 'wipe'; to: string }` | §4B "Scene & encounter transitions"; script.md beats 5a (`battle-slime-start`), 7a (`party-joins`); idea-board §9 "Encounter transition" (authentic-understated vs. punchier flash — still a [FORK]) |

### Dialogue & UI overlay (requirements §4C)

| Action | Shape sketch | Source |
|---|---|---|
| `thought` | `{ type: 'thought'; entity: string; text: string }` — a thought-bubble overlay, same mechanics as `say` | §4C; script.md's proposed thought beats |
| `showOverlay` | `{ type: 'showOverlay'; kind: 'act-card' \| 'headline' \| 'title'; text: string }` | §4C "Full-screen text/headline cards"; script.md act cards (`▸ STAGE 1: VIBE CODING`) and in-world headlines; idea-board §3 "in-world headlines as the SWE-is-dead satire" |
| `hideOverlay` | `{ type: 'hideOverlay' }` | pairs with `showOverlay`; also covers `autoClearMs`-style auto-clearing captions from the old beat model |
| `showMenu` | `{ type: 'showMenu'; kind: 'command' \| 'status' \| 'class-select'; options: string[] }` | §4C "RPG menu system"; idea-board §9 "Command window (Fight/Spell/Run/Item)" [LOCKED], §4 "technique-selection = DW3-style class-change screen" |
| `selectMenuOption` | `{ type: 'selectMenuOption'; index: number }` — moves the on-rails selection highlight, does not require real input | §4C "showing a selection highlight moving and a choice being 'made'" |
| `hideMenu` | `{ type: 'hideMenu' }` | pairs with `showMenu` |
| `typeText` | `{ type: 'typeText'; target: string; text: string }` — character-by-character reveal, distinct from `say`'s dialogue-box reveal | script.md beat 1 `name-entry` ("J", "O", "N" typed one at a time, then `CONFIRM`) |

### Scripted battle (requirements §4D, §4E)

| Action | Shape sketch | Source |
|---|---|---|
| `startBattle` | `{ type: 'startBattle'; enemies: string[]; surprised?: 'party' \| 'enemy' }` — `surprised` covers ambush framing | §4D "Battle scene layout"; script.md beat 5a; script.md's proposed `dungeon-ambush` beat (enemy attacks first because the hero was surprised) |
| `endBattle` | `{ type: 'endBattle'; outcome: 'victory' \| 'defeat' \| 'flee' \| 'stalemate' }` | §4D "Defeat / outcome sequences" |
| `battleAction` | `{ type: 'battleAction'; actor: string; target: string; kind: 'attack' \| 'spell' \| 'item' \| 'wrong-action'; damage?: number }` — `wrong-action` covers a scripted mistake | §4D "Scripted combat sequencing", "Command issuance depiction (including scripted mistakes)"; idea-board §7 "lone familiar casts Fire on a fire-immune enemy" |
| `defeatSequence` | `{ type: 'defeatSequence'; text: string }` — e.g. the "THOU ART DEAD" flash | §4D; script.md beat 5c; idea-board §4 death ladder ("Thou art dead" → King revives, half gold) |
| `partyJoin` | `{ type: 'partyJoin'; entity: string; fx?: string }` | §4E "Party scaling"; script.md beat 7a `party-joins`; assets.md `fx-join.png` |
| `tagCombatant` | `{ type: 'tagCombatant'; entity: string; action: 'in' \| 'out' \| 'needs-attention' }` | §4D "Multi-combatant choreography"; idea-board §6 Stage 2 "relay" party (one fights at a time, then tags out) |
| `showStatus` | `{ type: 'showStatus'; entity: string }` — inspectable status/stat screen on cue | §4E "Inspectable status menus" |
| `levelUp` | `{ type: 'levelUp'; entity: string; spell?: string }` — fanfare + a new ability appearing | script.md's proposed `dungeon-level-up` beat ("Jon learned Radiant!") |

### Diegetic resources (requirements §4F)

| Action | Shape sketch | Source |
|---|---|---|
| `setMeter` | `{ type: 'setMeter'; meterId: string; value: number }` | §4F "Attachable scriptable meters" |
| `addMeter` | `{ type: 'addMeter'; meterId: string; delta: number }` — for a running counter that ticks up (gold/cost) rather than jumping to an absolute value | §4F "Cost / currency counter" |

### Environmental — light radius (requirements §4G)

| Action | Shape sketch | Source |
|---|---|---|
| `setLightRadius` | `{ type: 'setLightRadius'; anchorEntity: string; radius: number; overSeconds?: number }` — real radius motion, executed like `walk`, not a generic tween | §4G "Scriptable light radius / fog"; idea-board §5 torch/light motif, §9 "Torch = 3×3 light; Radiant = 7×7, decaying over steps (radius 3 for 80 steps → 2 for 60 → 1 for 60)" [LOCKED as metaphor]; script.md's proposed `dungeon-radiant` beat |

### Meta-shell & flourishes (requirements §4H)

| Action | Shape sketch | Source |
|---|---|---|
| `showSaveFile` | `{ type: 'showSaveFile'; summary: string }` — the "completed, high-level prior playthrough" framing screen | §4H "Save-file / progression framing"; idea-board §3 "save file shows conquered/high-level character → 'AI-enhanced edition available'" |
| `showAchievement` | `{ type: 'showAchievement'; text: string }` | §4H "Achievement toasts"; idea-board §8 (DCC-flavored "Thou Hast…" pop-ups, one per stage) |
| `hideAchievement` | `{ type: 'hideAchievement' }` | pairs with `showAchievement` |

---

## Not yet action-shaped (flagged, not sketched)

These are real capabilities or ideas that will need action(s) eventually but aren't specific enough yet to sketch a shape:

- **Class-change / job-select screen** as its own interactive-looking sequence, beyond the generic `showMenu(kind: 'class-select')` sketch above (idea-board §4, §9 DW3 class-change shrine).
- **Encounter-transition style** is an open `[FORK, minor]` in idea-board §9 — `transitionScene`'s `style` field should get a real enum once that's resolved, not before.
- **Achievement-to-death-mechanic pairing** — idea-board §8 notes the death achievement's text must match whichever context-failure mechanic (clear vs. compaction) is ultimately chosen; no new action needed, just correct `text` content once that fork resolves.
