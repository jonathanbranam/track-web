# ADM Talk — Phased Implementation Proposal

**Source.** Extracted and expanded from `requirements.md` §7 ("Suggested
phased implementation"). That section is the terse version; this doc is the
working proposal — each phase gets explicit goals/non-goals so it can be
scoped directly into an OpenSpec change. `requirements.md` remains
authoritative on capability *definitions*; this doc is authoritative on
*sequencing and phase scope*.

**Why this ordering.** Phases are ordered to front-load architectural risk
(the Director's action-list/precompute-pass split, §5 of `requirements.md`,
is the single highest-risk piece) and to leave a runnable, demoable artifact
at the end of every phase. Phases can overlap in practice — asset
integration (Phase 8) in particular is continuous — but each is scoped to
land as its own **small–medium OpenSpec change**, in order, so review stays
tractable and later phases can build on a merged, working foundation rather
than a moving target.

**Relationship to §8's proposal boundaries.** `requirements.md` §8 groups
capabilities into 7 candidate proposals for spec-writing purposes (e.g.
"Scripted battle" bundles groups D+E together). This phase plan splits two of
those groupings across two phases each for implementation sizing: group E
(entities/stats/party) is mostly deferred from Phase 4 into its own Phase 6
so a single fight with one ally ships before multi-combatant party
choreography is tackled, and scene/encounter transitions are split between
Phase 2 (basic scene switching) and Phase 4 (the battle-specific "enemy
appears" transition). Use §8 when writing the spec's capability grouping;
use this doc when scoping what an individual change actually implements.

**Placeholder-first.** Every phase through Phase 7 works entirely in
placeholder rectangles/tiles — no real PixelLab art is required until
Phase 8. Don't let art readiness block engine work; don't let engine work
wait on art.

---

## Phase checklist

- [x] Phase 1 — The Director (action list + precompute pass)
- [x] Phase 2 — World rendering + Director integration
- [x] Phase 3 — Text & UI overlay
- [x] Phase 4 — Scripted battle
- [x] Phase 5 — Diegetic resources & environment
- [ ] Phase 6 — Party & stats
- [ ] Phase 7 — Meta-shell & flourishes
- [ ] Phase 8 — Asset integration & polish
- [ ] Phase 9 — Zoom-performance hardening

---

## Phase 1 — The Director (action list + precompute pass)

- [x] **Status: complete**
- **OpenSpec change:** `openspec/changes/archive/2026-07-04-director-precompute-pass/`
- **Artifacts:** [x] proposal · [x] design · [x] specs · [x] tasks

This is the spine of the whole framework (`requirements.md` §3, §5) and
carries the most architectural risk, so it goes first, alone, with nothing
else riding on it yet.

### Goals

- Define the initial action vocabulary needed to prove out the timeline:
  `walk` (literal path only), `pause`, `stop`, and enough of `startDialogue`/
  `say`/`endDialogue` to exercise non-movement actions too.
- Build the **deterministic precompute pass**: run the entire action list
  once, headlessly (no real-time waiting, no animation-frame timing), and
  cache a full resting-state snapshot at every `stop`.
- Implement `snapTo(i)` — apply a cached resting state instantly and
  explicitly, with nothing inherited from whatever was previously on screen.
- Implement presenter controls: `next` (live playback of the next segment),
  `back` (instant re-apply of the previous cached checkpoint, no replay),
  `pause`/`resume` (halt and resume whichever action is mid-flight).
- Implement skip-to-any-checkpoint, forward or backward, at any distance.
- Prove all of the above against a tiny placeholder map with placeholder
  rectangle "entities" — no tilemap, no sprites, no real rendering engine
  integration yet.

### Non-goals

- No Phaser, tilemap, sprites, animation, or camera — placeholder rectangles
  only (Phase 2).
- No A* pathfinding (`walkTo`) — literal `walk` paths only (Phase 2).
- No DOM overlay, styled dialogue boxes, or menus — dialogue actions may
  exist in the vocabulary but render as placeholder text, not real UI
  (Phase 3).
- No battle, meters, light radius, party, meta-shell, or asset pipeline —
  all later phases.
- No hand-authored resting states, ever — if a design needs someone to type
  out a snapshot by hand, that's a regression against §5 and should be
  flagged, not shipped.

### Milestone

A handful of authored actions play forward live on click, pause mid-action,
jump back instantly, and skip to any checkpoint — display always correct,
never a hand-written per-step snapshot.

---

## Phase 2 — World rendering + Director integration

- [x] **Status: complete**
- **OpenSpec change:** `openspec/changes/archive/2026-07-04-world-rendering-integration/`
- **Artifacts:** [x] proposal · [x] design · [x] specs · [x] tasks

Wires the Phase 1 Director into a real rendering engine, still entirely in
placeholder art.

### Goals

- Integrate Phaser: tilemap rendering, sprite rendering/animation
  (idle/walk/directional facing), and camera control (position, scroll,
  follow, pan).
- Build one small, fixed, pre-built placeholder map with baked NPC
  positions and named locations (`requirements.md` §4B).
- Implement real `walk` execution (actual stepwise map movement, not a
  teleport) and `walkTo` (A* pathfinding to a named location or entity),
  fully deterministic.
- Implement scene/area management — defining multiple scenes and switching
  the active one as the timeline dictates (town/overworld/cave-shaped
  scaffolding; battle/meta-screens can remain stubs until their own phases).
- Confirm `back`/`skip` from Phase 1 still land at pixel-correct resting
  positions via the precomputed cache — not by replaying movement.

### Non-goals

- No DOM overlay, dialogue boxes, or menus — still placeholder/console-level
  text if anything (Phase 3).
- No encounter/battle transition effects — general scene switching only;
  the battle-specific "enemy appears" flash belongs to Phase 4.
- No real art — placeholder tiles/sprites throughout (Phase 8).
- No battle, meters, light radius, party scaling, or meta-shell.

### Milestone

The protagonist walks a placeholder town on rails, including one pathfound
`walkTo`; back and skip still land at pixel-correct resting positions via
the precomputed cache, not replay.

---

## Phase 3 — Text & UI overlay

- [x] **Status: complete**
- **OpenSpec change:** `openspec/changes/archive/2026-07-04-text-ui-overlay/`
- **Artifacts:** [x] proposal · [x] design · [x] specs · [x] tasks

Adds the legibility-critical DOM layer. This is also the first hard check
against the Zoom-codec constraint (`requirements.md` §3), so it's scoped as
its own phase rather than folded into rendering or battle.

### Goals

- Build the DOM overlay layer (React, positioned over the Phaser canvas),
  kept in sync with the underlying scene.
- Implement world-anchored positioning so an overlay element (speech
  bubble, label) tracks its entity as the camera moves.
- Implement styled dialogue boxes and talk bubbles for `say`/`thought`/
  `startDialogue`/`endDialogue`.
- Implement the RPG command/status **menu shell** — command windows and
  status/inspection screens with a selection highlight that can move and a
  choice that can be "made," all on rails (no real selection logic yet;
  real stats content arrives in Phase 6).
- Implement full-screen/overlaid text cards (headline/title-card style).
- Run a hard legibility pass validated against an actual Zoom re-encode of
  the shared window, not just the local canvas — large type, high contrast,
  restrained motion.

### Non-goals

- No real battle behind the command menu — the menu plays on rails with no
  combat logic (Phase 4).
- No entity stats content in the status screen — the screen exists and can
  be shown/dismissed, but real stat data is Phase 6.
- No meters, light radius, achievement toasts, or final art.

### Milestone

An NPC conversation and a menu selection play on rails with large, crisp
text, verified locally (unit/precompute tests, Playwright screenshots) —
`snapTo`/`back`/`skip` land the dialogue/menu/overlay slots correctly with no
stale content. The hard legibility pass against an actual Zoom re-encode of
the shared window was **not** run as part of this phase (it needs a live
Zoom call, not a local check); it's folded into Phase 9's full-deck Zoom
validation rather than reopened here.

---

## Phase 4 — Scripted battle

- [x] **Status: complete**
- **OpenSpec change:** `openspec/changes/archive/2026-07-04-scripted-battle/`
- **Artifacts:** [x] proposal · [x] design · [x] specs · [x] tasks

The first full vertical slice of the "give orders to your ally" motif —
scoped to a **single** allied combatant to keep this change small–medium;
multi-combatant choreography is deliberately deferred to Phase 6.

### Goals

- Build the battle scene layout (enemy on field, party framing, command
  window) using the Phase 3 menu shell.
- Implement the encounter transition (the "an enemy appears" flash/wipe)
  and battle scene entry/exit.
- Implement scripted combat sequencing: a fixed action sequence — combatant
  acts, enemy retaliates, damage numbers appear, HP changes — with no
  combat AI and no real mechanics.
- Implement command-issuance depiction: protagonist issues a command, one
  allied combatant executes it (including a scripted *wrong* execution, per
  script).
- Implement defeat/outcome sequences: victory, defeat, flee, stalemate.
- Track just enough entity state (HP) to drive the damage/outcome display —
  not the full stats/status model (that's Phase 6).

### Non-goals

- No multi-combatant choreography, tagging in/out, or party scaling beyond
  one ally (Phase 6).
- No inspectable status/stats screens with real content (Phase 6).
- No meters or light radius (Phase 5).
- No final art — placeholder battle scene visuals.

### Milestone

One complete scripted fight from encounter to resolution, fully reversible
via `back`/`skip` — verified locally (unit/precompute tests, Playwright
screenshots): the encounter flash, command menu, a correct `battleAction`,
a `wrong-action` heal, and the `'defeat'` full-screen card all render
correctly, and `back()`/`skipTo()` land combatant HP/position/`ui` state
correctly across the battle checkpoint boundary with no stale state from
the field scene or a prior fight. The demo script only authors the
`'defeat'` outcome; `endBattle`'s `victory`/`flee`/`stalemate` outcomes are
supported by the same reducer but not yet exercised by any authored
content — a content-authoring gap, not an engine one.

---

## Phase 5 — Diegetic resources & environment

- [x] **Status: complete**
- **OpenSpec change:** `openspec/changes/archive/2026-07-04-meters-and-light-radius/`
- **Artifacts:** [x] proposal · [x] design · [x] specs · [x] tasks

Two independent, self-contained systems (meters and light radius) that
don't depend on party scaling or the battle system, so they're grouped into
one change and can be built in parallel with Phase 4/6 if useful.

### Goals

- Implement attachable scriptable meters/gauges on an entity, driven by
  hardcoded per-step values from the timeline (theatrical props, not a live
  simulation).
- Implement the cost/currency (gold) counter as a specific instance of a
  meter, styled as in-world currency.
- Implement the bar-style capacity-meter option, as an alternative to the
  light-radius treatment (`requirements.md` §4F note) — narrative picks one
  later; the framework supports both.
- Implement scriptable light radius/fog: only tiles within a radius around
  a chosen entity are visible, with the radius changeable over the timeline
  (grow/shrink/extinguish, including to zero).
- Ensure both systems reconstruct correctly from `snapTo(i)` — a jump into
  or out of a cave scene, or past a meter change, lands at the correct value
  instantly.

### Non-goals

- No party/stats model changes (Phase 6).
- No meta-shell content.
- No decision on which capacity treatment (bar vs. light radius) the
  narrative actually uses — that's a content choice, tracked in
  `idea-board.md`, not this phase.

### Milestone

A cave scene whose light radius grows/shrinks/extinguishes on script, and a
cost counter that ticks on beats — both snapping correctly under back/skip.

---

## Phase 6 — Party & stats

- [ ] **Status: not started**

Extends Phase 4's single-combatant battle into the escalating, multi-ally
party that's the visible "growth" arc of the talk.

### Goals

- Implement the full entity/stats model (HP, level, role, etc.) for
  protagonist, allied combatants, NPCs, and enemies.
- Implement inspectable status menus with real stat content, using the
  Phase 3 menu shell.
- Implement party scaling: support one to several allied combatants,
  each independently positioned, animated, and commandable.
- Implement multi-combatant choreography: sequencing several allies acting,
  waiting, tagging in/out, or needing attention, in a controlled order —
  extending Phase 4's single-combatant command-issuance flow.

### Non-goals

- No changes to the core battle-sequencing engine from Phase 4 beyond what's
  needed to support >1 combatant — this is additive, not a rewrite.
- No meta-shell or final art.

### Milestone

A battle with a multi-member, role-tagged party whose stats can be shown,
coordinated on rails.

---

## Phase 7 — Meta-shell & flourishes

- [ ] **Status: not started**

Purely additive presentation "bookend" screens — no new Director, rendering,
or battle capability is required, which is why this is scoped after the
mechanically riskier phases even though it includes the cold open.

### Goals

- Implement the title/start screen with selectable menu entries (shown
  being selected on rails, via the Phase 3 menu shell).
- Implement the save-file/progression framing screen ("completed game" state)
  and the "enhanced edition available" prompt that transitions into the main
  experience.
- Implement achievement toasts: styled notifications that pop on scripted
  beats and dismiss, one per stage.

### Non-goals

- No new engine primitives — this phase should consume Phase 1–6
  capabilities (actions, overlay, menus) rather than add new ones.
- No final art.

### Milestone

The cold open runs end-to-end — start screen → "enhanced edition" select →
first headline → first achievement.

---

## Phase 8 — Asset integration & polish

- [ ] **Status: not started**

Swaps every placeholder for real PixelLab-generated art. Continuous in
practice (per the note in `requirements.md` §7), but scoped as its own
change so there's a clear point where "placeholder-complete" becomes
"art-complete."

### Goals

- Integrate externally-authored PixelLab art (character, familiars, NPCs,
  enemies, tilesets) through the defined sprite-sheet/tileset/animation-frame
  conventions (`requirements.md` §4I), with placeholder art swappable
  without engine changes.
- Tune animation timing and transitions, keeping motion restrained enough to
  survive Zoom compression.
- Lock fixed internal resolution and integer scaling to the dimensions of
  the shared browser window/tab.

### Non-goals

- No new functional capability in the Director, battle, menus, meters, or
  party systems — this phase is integration and tuning only.
- Full asset coverage isn't required in one pass — de-risk by validating one
  full stage on final art before doing the rest.

### Milestone

One full stage running on final art that still reads clearly through a test
Zoom share.

---

## Phase 9 — Zoom-performance hardening

- [ ] **Status: not started**

The final gate before the talk is presentation-ready. Validation and
hardening only — no new features.

### Goals

- Implement complete asset preload before playback begins; confirm no
  runtime network fetch or unseeded randomness anywhere in the playback
  path.
- Build the private presenter surface (current/next beat, jump-to-section
  list, step index, optional speaker notes) in a separate window or
  off-share region.
- Validate over an actual Zoom call: share the game window, confirm
  framerate holds while Zoom encodes, and check the compressed stream
  (recording or second viewer) for text/art/transition legibility. Test both
  Zoom's normal and "optimize for video" share modes.
- Decide, based on measured load time against the full final action list,
  whether the precompute pass runs in-browser on load or is moved to an
  offline/build-time step that serializes the checkpoint array to disk.

### Non-goals

- No new capabilities — if hardening surfaces a missing capability, it goes
  back to the relevant earlier phase, not into this one.

### Milestone

The complete deck runs start-to-finish offline on the presentation laptop,
driven by mouse/keyboard, verified as it looks *to a Zoom viewer* — not just
locally.
