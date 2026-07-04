# ADM Talk — Presentation Framework MVP / POC

**Purpose of this document.** This is the framework brief that will seed the
OpenSpec proposals and designs. It deliberately describes *the engine that runs
the presentation*, not the presentation's story. Narrative decisions (how many
stages, which mechanic appears where, who the NPCs are, what the dialogue says,
whether context failure is shown as a clear or a compaction) are treated as
**content** — data fed into the engine — and are intentionally kept out of the
capability requirements. If a requirement here depends on a story choice, it's
written wrong; the test for every capability below is "does this survive us
changing our minds about the script?"

> **Delivery context (drives several requirements below).** This is presented
  **virtually over Zoom**, not in a room. The presenter drives from a laptop
  with **full mouse + keyboard** (no clicker), sharing a single game
  **window/tab**. Essentially all of the audience watches the **Zoom-compressed
  stream** on their own high-res laptops (a small minority on a conference-room
  TV — same stream). This means the real display target is *"after Zoom's lossy
  video codec has re-encoded it,"* not the source resolution. Two consequences
  run through the whole spec: (1) the codec punishes motion and fine
  high-frequency detail, so favor bold shapes, high contrast, large text, and
  restrained motion; (2) the game runs on the presenter's laptop *while Zoom is
  also encoding a screen-share*, so it must hold a smooth framerate with
  performance headroom to spare. The mouse+keyboard control model also unlocks a
  **private presenter surface** (see §4J) that the audience never sees.

---

## 1. Concept in one paragraph

The deliverable is a single **on-rails RPG "playthrough" that runs like an
animated slide deck.** It looks and behaves like a real 2D top-down RPG —
tilemaps, sprites, animations, battle screens, menus — but nothing is actually
interactive gameplay. Every beat is scripted. The presenter advances it exactly
like a slide deck: a keypress or mouse-click starts a segment, it auto-plays a
short sequence, then rests and waits for the next input. The presenter can pause
anytime, jump backward, and skip to any point near-instantly. The engineering
meaning of the talk lives entirely in the presenter's spoken words; the screen
only ever shows a fantasy world with **zero software vocabulary on it.** The
framework's job is to make that fantasy world play back deterministically,
legibly, and robustly as a Zoom screen-share driven from a laptop.

## 2. The arc the framework must support (narrative-agnostic)

The framework must be able to render, in sequence and reversibly:

1. **A meta / framing shell** — a title screen, evidence that the base "game" is already conquered (a high-level save), and the discovery of an "enhanced" edition that, when selected, starts the main experience.
2. **An overworld + town layer** — a character moving on rails through towns and open map, encountering NPCs who speak, and running into enemies.
3. **A battle layer** — scripted fights where a controllable protagonist issues commands and one or more allied combatants act, while enemies fight back, resolving in victory, defeat, or a scripted outcome.
4. **Environmental set-pieces** — e.g. constrained-visibility "cave" scenes.
5. **Escalation** — the protagonist's allied combatants grow in number (one to several) and capability across the run.
6. **A resolving coda** — a final confrontation and an ending card (including an open "to be continued" state).

The engine must treat all six as the *same underlying machinery*: scenes, entities, a camera, overlaid UI, scriptable meters, and a timeline that drives them. Stage count and ordering are content.

## 3. Guiding architectural principles

These are the non-negotiables that every proposal should honor.

**Framework/content separation.** The engine knows nothing about the story. The story is a **declarative script (data)** describing a sequence of steps and their resting states. Rewriting the talk should mean editing data, not code. This is what lets us keep brainstorming the narrative while the engine is being built.

**Deterministic timeline with a resting-state model.** The entire presentation
is an ordered list of discrete **steps**. Every step defines a complete
**resting state** — the full snapshot of everything on screen when that step is
at rest — that can be reconstructed *from its index alone*, with no dependence
on how playback arrived there. This single rule is what makes pause, back, and
skip trivial and reliable. It is the spine of the whole system; if it's
compromised, every control becomes fragile.

**Legibility through the Zoom codec, not just at native resolution.** The
audience sees a lossy re-encode of the shared window, so the design must survive
compression: bold silhouettes, high contrast, large text, and *restrained*
motion beat pixel-authentic reproduction every time. Text renders as crisp DOM
overlay, not in-canvas bitmap font. Fine high-frequency pixel detail and fast
full-screen motion (rapid pans, particle-heavy transitions, constantly-animating
meters) are exactly what the codec smears — prefer discrete, deliberate motion
on meaningful beats. Design at a fixed internal resolution and integer-scale to
avoid shimmer, but validate against a real Zoom re-encode, not just the local
canvas.

**Live-performance robustness under screen-share.** During the talk there is no
room for a hitch, and the game runs on the presenter's laptop *while Zoom
simultaneously encodes the screen-share* — a real CPU/GPU competitor. Everything
preloads before the first slide; nothing fetches over the network at runtime;
nothing is random unless seeded; and the render loop must hold a smooth
framerate with headroom to spare so Zoom's encoder never starves it. Any control
the presenter touches must respond instantly and never desync the display.

## 4. Framework capabilities

Grouped so that each group maps cleanly to a candidate OpenSpec proposal. Each item states the capability and how it will actually be used.

### A. Playback & timeline — "the Director" (the core)

- **Deterministic step timeline.** The framework can hold an ordered list of steps, each with a fully-specified resting state. *In use:* this is the backbone the entire show plays along; step indices are the presentation's "slide numbers."
- **Instant state reconstruction (`snapTo(i)`).** The framework can set every scriptable property on screen to step *i*'s resting values instantly, with no tweening and no reliance on prior state. *In use:* powers backward jumps and skip-to-anywhere; guarantees the display can never drift out of sync.
- **Forward animation (`animateInto(i)`).** The framework can tween from step *i-1*'s resting state into step *i*'s resting state. *In use:* this is the visible "motion" of the show — a character walking, a meter filling, an enemy appearing.
- **Segment playback to a break.** The framework can auto-play a chain of forward animations until it reaches a step flagged as a stopping point, chaining on animation completion rather than fixed timers. *In use:* one keypress or click plays a whole beat and then waits; matches the animated-PowerPoint feel.
- **Presenter controls: next, back, pause/resume.** Next plays the next segment; back instantly jumps to the previous break; pause halts all motion and resumes exactly where it stopped. *In use:* the presenter's entire interaction surface during the talk.
- **Skip to any section.** The framework can jump directly to any step/section near-instantly and deterministically, forward or backward. *In use:* recovery and rehearsal — the presenter can jump to any stage or re-run a beat without replaying everything before it. More useful over Zoom, where a jump is done quietly on the presenter's own screen.
- **Mouse + keyboard bindings and on-screen controls.** Bindings map to convenient laptop keys (e.g. Space/→ for next, ←/Backspace for back, a letter for pause) *and* a clickable control bar, since the presenter drives with a full keyboard and mouse — no clicker to accommodate. *In use:* whichever is more comfortable mid-talk; the on-screen bar doubles as the visible control surface if the game window is what's shared.

### B. World rendering & simulation

- **Tilemap rendering.** The framework can render tile-based scenes (towns, overworld, caves) from tilesets. *In use:* every non-battle location.
- **Sprite rendering & animation.** The framework can draw and animate sprites (idle, walk cycles, directional facing, action poses) for the protagonist, allied combatants, NPCs, and enemies. *In use:* everything that moves.
- **Camera control.** The framework can position, scroll, follow, and pan a camera within a scene. *In use:* following the character through a town, panning across a set-piece, framing a battle.
- **Scripted path movement.** The framework can move entities along predefined paths at defined times, using real engine motion (not teleport hacks), while remaining fully deterministic. *In use:* all "canned" character movement; must still snap correctly to resting positions on back/skip.
- **Scene / area management.** The framework can define multiple scenes (town, overworld, cave, battle, meta-screens) and switch the active scene as the timeline dictates. *In use:* moving between locations and into/out of battle.
- **Scene & encounter transitions.** The framework can play transition effects between scenes and when a battle begins (e.g. a flash/wipe when an enemy appears). *In use:* the recognizable "an enemy appears" beat and location changes; transition style is content-tunable.

### C. Text & UI overlay

- **DOM overlay layer.** The framework can render UI text as DOM elements positioned over the game canvas for maximum legibility, kept in sync with the underlying scene. *In use:* all readable text; chosen specifically for projection clarity.
- **World-anchored positioning.** The framework can anchor an overlay element (speech bubble, label) to a world-space entity so it tracks the correct on-screen position as the camera moves. *In use:* NPC talk bubbles and combatant labels that stay attached to their sprite.
- **Dialogue boxes & talk bubbles.** The framework can display styled dialogue with short lines of NPC/character text. *In use:* town conversations and battle callouts.
- **RPG menu system.** The framework can display command windows and status/inspection screens, including showing a selection highlight moving and a choice being "made," without any of it being truly interactive. *In use:* battle command menus and character/party status screens, played on rails.
- **Full-screen text/headline cards.** The framework can present full-screen or overlaid text cards. *In use:* in-world "prophecy"/newspaper headlines and stage titles; content-defined text.

### D. Scripted battle

- **Battle scene layout.** The framework can present a battle arrangement (enemy on field, party framing, command window) consistent with the RPG style. *In use:* every fight.
- **Scripted combat sequencing.** The framework can play out a fight as a fixed sequence of actions — a combatant acts, an enemy retaliates, damage numbers appear, HP changes — with **no combat AI and no real mechanics.** *In use:* all battles; outcomes are authored, not computed.
- **Command issuance depiction.** The framework can show the protagonist issuing a command and an allied combatant executing it (or, per script, executing the *wrong* thing). *In use:* the core "give orders to your ally" motif, including scripted mistakes.
- **Multi-combatant choreography.** The framework can sequence several allied combatants acting, waiting, tagging in/out, or needing attention, in a controlled order. *In use:* the escalating party beats where the protagonist coordinates multiple allies.
- **Defeat / outcome sequences.** The framework can play a defeat/"death" sequence and other scripted outcomes (victory, flee, stalemate). *In use:* the ends of stages that resolve in failure or success.

### E. Entities, stats & party

- **Entity model with stats.** The framework can represent the protagonist, allied combatants, NPCs, and enemies as entities carrying displayable stats and state (HP, level, role, etc.). *In use:* status screens and battle displays.
- **Inspectable status menus.** The framework can display an entity's stats in an RPG-style status screen on cue. *In use:* showing the protagonist's "already accomplished" state, or a combatant's role/stats.
- **Party scaling (one to several allies).** The framework can support a party that grows from a single allied combatant to several, each independently positioned, animated, and commandable. *In use:* the visible headcount growth across stages; supports role/class differentiation as content.

### F. Diegetic resource systems

- **Attachable scriptable meters.** The framework can attach one or more gauges/counters to an entity and drive their values from the timeline as theatrical props (hardcoded per-step values, not a live simulation). *In use:* the ally's "capacity" indicator and other on-screen gauges; values move only on meaningful beats, not continuously.
- **Cost / currency counter.** The framework can display a running numeric counter styled as in-world currency (gold), driven by the script. *In use:* the "cost" motif; this one carries a real-world-legible number by design, since cost is meant to read literally.
- *(Note: the "capacity/context" concept is expected to be represented environmentally via the light-radius system in section G rather than as a bar; the framework should support both a bar-style meter and the light-radius treatment so the narrative can choose.)*

### G. Environmental systems (constrained visibility)

- **Scriptable light radius / fog.** The framework can render a scene where only tiles within a radius around a chosen entity are visible, and can change that radius over the timeline (grow, shrink, extinguish). *In use:* the "cave" set-pieces; the visible extent of light is a scriptable value the story can drive up or down, including to zero.
- **Deterministic under skip/back.** Light-radius state, like everything else, reconstructs correctly from a step index. *In use:* jumping into or out of a cave scene lands at the correct light state instantly.

### H. Meta-shell & flourishes

- **Title / start screen.** The framework can present a game-style start screen with selectable menu entries (shown being selected on rails). *In use:* the cold open.
- **Save-file / progression framing.** The framework can display a "saved game" state indicating a completed, high-level prior playthrough, and an "enhanced edition available" prompt that, when "selected," transitions into the main experience. *In use:* establishing the protagonist's accomplishment and the New-Game-style entry into the AI world.
- **Achievement toasts.** The framework can pop styled achievement notifications on scripted beats and dismiss them. *In use:* punctuating each stage with a single cheeky achievement; text and timing are content, one per beat.

### I. Asset pipeline

- **External art integration.** The framework can consume externally-authored pixel art (character, familiars, NPCs, enemies, tilesets) — produced via PixelLab.ai — through defined sprite-sheet/tileset/animation-frame conventions. *In use:* all visuals; the pipeline must let placeholder art be swapped for final art without engine changes.
- **Fixed internal resolution + integer scaling, sized for the shared window.** The framework renders at a fixed internal resolution and scales by integer factors, targeting the dimensions of the browser window/tab that will actually be shared over Zoom. *In use:* prevents shimmer; the design must still read clearly after Zoom downscales and re-compresses the share, which favors chunkier art and larger UI than pixel-authenticity alone would suggest.
- **Complete preload.** The framework can preload all assets before playback begins. *In use:* guarantees no runtime asset fetch mid-talk and keeps the render loop free of hitches while Zoom is also using the machine.
- **(Optional, and Zoom-risky) audio.** The framework may support background music and SFX cues tied to the timeline. *In use:* atmosphere and punctuation — but over Zoom this must go through "share computer sound" and competes directly with the presenter's mic, so treat it as out-of-scope for the MVP and, if used later, keep it sparse and low so it never muddies the voice.

### J. Authoring & operations tooling

- **Declarative script format.** The framework can define the entire show as an editable data script of steps and resting states. *In use:* the surface where the narrative is actually authored and revised.
- **Private presenter surface (Zoom-enabled).** Because only the game window/tab is shared, the framework can host presenter-only controls the audience never sees — current/next beat, a jump-to-section list, step index, and optional speaker notes — in a separate window or an off-share region. *In use:* the presenter's real cockpit during the talk; strictly better than a clicker, and the reason skip-to-any-step is worth investing in.
- **Debug jump / step readout.** The framework can, in a development/rehearsal mode, display the current step index and jump to an arbitrary step. *In use:* building, testing, and rehearsing without replaying from the top (and it feeds the presenter surface above).
- **Script hot-reload (dev).** The framework can reload the script during development without a full rebuild. *In use:* fast iteration while writing beats.
- **Offline/deterministic operation mode.** The framework can run fully offline with no network calls and no unseeded randomness during playback. *In use:* the live-performance guarantee.

## 5. The step resting-state model (core data schema)

This is the heart of the framework and the first thing the OpenSpec design should pin down. A **step** is an index plus a resting state plus flags. The resting state should be able to specify, for that moment:

- **Active scene / area** (town, overworld, cave, battle, meta-screen).
- **Camera** — position and zoom.
- **Entities** — for each present entity: position, facing, and current animation state.
- **Active UI** — which dialogue box / menu / status screen is visible, its text content, and any selection highlight position.
- **Overlays** — active full-screen cards (headlines, titles) and their text.
- **Meters** — values for any attached gauges (e.g. cost/gold), and bar-style capacity if used.
- **Light radius** — for cave scenes, the current visible radius and its anchor entity.
- **Battle state** — combatant/enemy HP and any in-fight status being shown.
- **Achievement trigger** — an optional achievement that fires on entering this step.
- **Flags** — notably `pauseAfter` (this step is a presenter stopping point) and section membership (for skip-to-section).

The rule that makes it all work: **`snapTo(i)` sets every one of these fields explicitly from step *i*'s definition and never inherits leftover values from a previous step.** `animateInto(i)` interpolates the animatable subset (positions, camera, meters, light radius, HP) from *i-1* to *i*; non-animatable fields (active scene, visible menu, overlay text) switch discretely. Getting this contract right is the single highest-value design decision in the project.

## 6. Explicit non-goals for the MVP

- **No real interactivity or gameplay.** No player-controlled movement, no combat AI, no win/lose logic — every outcome is authored.
- **No branching.** The timeline is linear; skip/back navigate a single ordered sequence, they don't choose paths.
- **No persistence/save system** beyond the cosmetic "completed game" framing screen.
- **No networked or multi-machine features.** It runs locally on the presenter's laptop, offline, and is delivered to the audience only as a Zoom screen-share of one window.
- **No general-purpose level editor.** Authoring is via the declarative script and dev tooling, not a full visual editor.
- **Audio is optional and de-prioritized** — not required for the POC, and risky over Zoom (competes with the mic; needs "share computer sound").

## 7. Suggested phased implementation

Ordered to **front-load architectural risk** and to keep a runnable, demoable artifact at the end of every phase. Phases can overlap; asset integration in particular is continuous. Each phase names its proving milestone.

**Phase 1 — The Director (timeline core).** Build the deterministic step model, `snapTo`/`animateInto`, segment-to-break playback, and next/back/pause plus skip-to-any-step, all with placeholder rectangles and no real art. *Milestone:* a handful of colored-block "steps" that play forward on click, pause mid-motion, jump back instantly, and skip to any index — with the display always correct. This de-risks the hardest part before any art exists.

**Phase 2 — World rendering + Director integration.** Add Phaser tilemap, sprite animation, camera, and scripted path movement, all driven by the Director's resting-state model. *Milestone:* the protagonist walks a placeholder town on rails; back and skip still land at pixel-correct resting positions.

**Phase 3 — Text & UI overlay.** Add the DOM overlay layer, dialogue boxes, world-anchored talk bubbles, and RPG command/status menus, with a hard legibility pass judged against a Zoom re-encode, not just the local canvas. *Milestone:* an NPC conversation and a menu selection play on rails with large, crisp text that stays readable after screen-share compression.

**Phase 4 — Scripted battle.** Add the battle scene, encounter transition, command issuance, ally action, enemy retaliation, damage/HP display, and defeat/outcome sequences. *Milestone:* one complete scripted fight from encounter to resolution, fully reversible.

**Phase 5 — Diegetic resources & environment.** Add attachable scriptable meters (cost/gold), bar-style capacity option, and the scriptable light-radius/fog cave system. *Milestone:* a cave scene whose light radius grows/shrinks/extinguishes on script and a cost counter that ticks on beats — all snapping correctly under back/skip.

**Phase 6 — Party & stats.** Add the entity/stats model, status-inspection screens, party scaling to several allies, and multi-combatant choreography. *Milestone:* a battle with a multi-member, role-tagged party whose stats can be shown, coordinated on rails.

**Phase 7 — Meta-shell & flourishes.** Add the title/start screen, save-file/enhanced-edition framing, full-screen headline/title cards, and achievement toasts. *Milestone:* the cold open runs end-to-end — start screen → "enhanced edition" select → first headline → first achievement.

**Phase 8 — Asset integration & polish.** Swap placeholders for PixelLab art via the asset conventions, tune animation timing and transitions (keeping motion restrained enough to survive compression), and lock resolution/integer scaling to the shared-window size. *Milestone:* one full stage running on final art that still reads clearly through a test Zoom share.

**Phase 9 — Zoom-performance hardening.** Full preload, disable any runtime network/RNG, wire up the private presenter surface, and validate over an **actual Zoom call**: share the game window, confirm the framerate holds while Zoom encodes, and watch the compressed stream (ideally a recording, or a second viewer) to check that text, pixel art, and transitions survive the codec. Test both Zoom's normal and "optimize for video" share modes. *Milestone:* the complete deck runs start-to-finish offline on the presentation laptop, driven by mouse/keyboard, verified as it looks *to a Zoom viewer* — not just locally.

## 8. Candidate OpenSpec proposal boundaries

The capability groups are drawn to become separable proposals. A natural first cut:

1. **Director & timeline** (group A + the section-5 schema) — foundational, spec this first and in most detail.
2. **Rendering & world simulation** (group B).
3. **Text & UI overlay** (group C).
4. **Scripted battle** (group D + E).
5. **Diegetic resources & environmental systems** (group F + G).
6. **Meta-shell & flourishes** (group H).
7. **Asset pipeline & operations** (group I + J).

Proposals 2–7 all depend on Proposal 1's data contract, which is why the resting-state model must be settled early.

---

## Appendix — Requirements added beyond the recalled list

Surfaced from our discussion and standard practice, not in the original recall notes:

- **Framework/content separation** as an explicit principle, with a **declarative script format** as the authoring surface (§3, §4J).
- **The resting-state data schema** (§5) as a named, first-class design artifact.
- **Deterministic, seeded/no-RNG, fully-offline operation** for live robustness (§3, §4J).
- **Complete asset preload** and **fixed-resolution integer scaling** (§4I).
- **World-anchored overlay positioning** (keeping DOM text glued to moving sprites) (§4C).
- **Scene & encounter transitions** as a distinct capability (§4B).
- **Debug jump / step readout and script hot-reload** for building and rehearsal (§4J).
- **Presenter/rehearsal aids and a hardening phase** validated on the real machine + clicker (§7, Phase 9).
- **Legibility as a hard requirement** (DOM text, large type), not an afterthought (§3, §4C).
- **Optional audio** flagged explicitly as out-of-scope-but-supported (§4I, §6).

## Appendix — Parked narrative forks (not framework concerns)

Recorded so they aren't lost; none of these should affect the engine, and all are expressed as content:

- Framing flavor: voluntary "New Game+" vs. an unrequested "patch/DLC dropped on a finished game."
- Context-failure depiction: context **clear** (amnesia) as the load-bearing beat, with **compaction** (confusion) parked as an optional earlier throwaway.
- How much the protagonist physically fights vs. purely commands in the final stage (guarding the "commander, not bystander" reading).
- Whether real practitioners appear as NPCs and, if so, strictly paraphrased (no fabricated quotes); confirm any product terminology (e.g. on-screen command names) and factual claims before they're shown.
- Exact wording of the transition line into the AI world and the closing line.
