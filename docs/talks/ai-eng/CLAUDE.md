# docs/talks/ai-eng/ — Document Guide

Planning and design docs for the "Software Engineering Skills Are More Important
Than Ever" ADM talk — a self-playing, scripted Dragon Warrior-style RPG that
runs like an animated slide deck.

**`requirements.md` is the latest thinking and is authoritative.** It is the
framework brief (engine capabilities, not story) meant to seed OpenSpec
proposals, and it overrides any conflicting decision in `architecture.md` or
elsewhere in this folder. **`idea-board.md` is also newer thinking** — the live
narrative/content parking lot — and takes precedence over the older narrative
docs (`adm-talk-outline.md`, `script.md`) wherever they conflict, though many
open items there are intentionally still forks, not decisions.

## Documents

- **`requirements.md`** — *Latest / authoritative.* Framework capability
  requirements for the presentation engine: the authored action-list model
  (a fixed map + actions like `walk`/`say`/`pause`/`stop`) with resting states
  computed by a deterministic precompute pass, Director capabilities
  (snapTo/back/pause/skip), rendering, battle, UI overlay, asset pipeline, and
  phased build order. Narrative-agnostic by design. Supersedes `architecture.md`
  on any conflict.
- **`action-vocabulary.md`** — The single, growing list of the Director's
  action vocabulary (established actions from the `Action` type, plus proposed
  actions mined from `requirements.md` §4 and `idea-board.md`/`script.md` that
  aren't formalized yet). Linked from `requirements.md` §5 — update this doc,
  not a duplicate table, when the vocabulary changes.
- **`phased-implementation.md`** — Expanded proposal for `requirements.md` §7's
  9-phase build order: goals/non-goals and a completion checkbox per phase,
  each scoped to land as one small–medium OpenSpec change. Update this doc,
  not §7, when phase scope or sequencing changes; keep §7 as the terse
  original.
- **`idea-board.md`** — *Latest / live thinking.* Parking-lot of every
  brainstormed narrative/content idea and its open forks (framing, context
  metaphors, party scaling, achievements, factual guardrails). Not a decision
  doc — statuses (`LOCKED`/`LEANING`/`FORK`/`PARKED`/`VERIFY`) track how settled
  each idea is. Companion to `requirements.md` (engine) on the content side.
- **`architecture.md`** — Technical architecture for the Phaser + React
  Director implementation (render stack, action executors, the precompute
  pass, file layout). Reconciled with `requirements.md`'s action-list/
  precompute-pass model; the currently-shipped scaffold in `client-talks/`
  still reflects an older forward-only model and needs a follow-up change.
- **`script.md`** — Beat-by-beat map from the original talk outline to RPG
  beats (`phaserSegment` names, captions, timing). Content, written against the
  *original* forward-only Beat model — revisit once beats are reauthored as
  actions per `requirements.md` §5 / `action-vocabulary.md`.
- **`adm-talk-outline.md`** — Spoken talk outline: section-by-section timing,
  what the presenter says, cuts/compressions if over budget.
- **`context.md`** — One-page pitch/summary of the talk, both as a real-world
  talk description and as an "as Dragon Warrior gameplay" analogy.
- **`assets.md`** — Pixel-art style guide, per-asset inventory (character,
  tileset, NPCs, enemies, UI/FX), directory layout, and scaffold-phase
  (primitives-only) fallback.
- **`pixellab-api-guide.md`** — How to call the pixellab.ai API/MCP directly:
  auth, endpoints, sync/async patterns, code snippets.
- **`pixellab-capabilities.md`** — Reference mapping pixellab's web UI tools to
  API endpoints, with a recommended tool/model per asset type.
- **`prompt-log.md`** — Running log of prompt attempts per asset (prompt used,
  result, verdict, next iteration).
- **`writing-openspec-proposals.md`** — Agent prompt/checklist for turning the
  next unimplemented phase in `phased-implementation.md` into an OpenSpec
  change: which phase to pick (confirm with the user if ambiguous or
  out-of-order), which docs to read for scope vs. capability definitions, and
  how to link the in-progress change back into `phased-implementation.md` and
  update it on archive.

## Keep this file in sync

When a new document is added to this folder, or an existing one is renamed,
removed, or has a major change of purpose, **update this file in the same
change** — add/adjust its entry above and, if it changes which doc is
authoritative, update the framing at the top.
