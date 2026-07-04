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
  requirements for the presentation engine: the step/resting-state model,
  Director capabilities (snapTo/animateInto, back/pause/skip), rendering,
  battle, UI overlay, asset pipeline, and phased build order. Narrative-agnostic
  by design. Supersedes `architecture.md` on any conflict.
- **`idea-board.md`** — *Latest / live thinking.* Parking-lot of every
  brainstormed narrative/content idea and its open forks (framing, context
  metaphors, party scaling, achievements, factual guardrails). Not a decision
  doc — statuses (`LOCKED`/`LEANING`/`FORK`/`PARKED`/`VERIFY`) track how settled
  each idea is. Companion to `requirements.md` (engine) on the content side.
- **`architecture.md`** — Original technical architecture for the Phaser +
  React Director implementation (render stack, Beat lifecycle, event wiring,
  file layout). Predates `requirements.md`'s resting-state model; being
  reconciled with it (see conversation/change history for resolution status).
- **`script.md`** — Beat-by-beat map from the original talk outline to RPG
  beats (`phaserSegment` names, captions, timing). Content, written against
  `architecture.md`'s Beat model — revisit once the Director/step model from
  `requirements.md` is settled.
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

## Keep this file in sync

When a new document is added to this folder, or an existing one is renamed,
removed, or has a major change of purpose, **update this file in the same
change** — add/adjust its entry above and, if it changes which doc is
authoritative, update the framing at the top.
