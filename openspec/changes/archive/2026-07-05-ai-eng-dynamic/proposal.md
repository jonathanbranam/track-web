## Why

`client-talks` currently supports two talk kinds: static `content` pages and the `rpg` dialogue-tree experience. Neither can carry the new "AI Eng Dynamic" talk concept: a presenter-advanced visualization of how AI-assisted coding workflows manage volatile working memory (the context window) versus durable storage (plans, skills). That concept — the mutating "apparatus" diagram, block lifecycle (spawn/promote/evict/compact/flush), shelves, gauges, and gaze marker — is fully specified in `docs/talks/ai-eng-dynamic/interactive-framework.md` but has no runtime home. A third talk kind is needed now so the talk can be built and rehearsed before its presentation date.

## What Changes

- Add a new `apparatus` talk kind to `client-talks`, alongside a reusable presentation engine distinct from the RPG engine:
  - Beat/scene timeline model: presenter-advanced (spacebar/arrow), reversible, deterministic, with named scenes that support direct jump-to-start.
  - Block lifecycle primitives operating on a context-window apparatus: spawn, promote (copy chat → window, keeping the original in the chat log), shift/scroll, evict, compact, clear, flush (compound: consolidate → write to shelf → clear → drop reference), highlight/pulse.
  - Region behaviors: pin/unpin a foundation zone, a feedback arrow (skills shelf → next context's foundation), shelf-fill accumulation (plan shelf, skills shelf).
  - Gauges/counters: context-fill gauge (with overflow trigger), token counter (variable-speed count-up), status flips (bug indicator, working-features counter).
  - Gaze marker: points at a target pane (app/spec/code/skills), holds until re-pointed.
  - Scene-swap support so the stage can switch cleanly between apparatus scenes and the non-apparatus cold-open/close scenes (ticker, divergence chart, bar animation).
  - Presenter-only "current beat / next action" readout.
- Author the "AI Eng Dynamic" talk content itself (cold open → Stage 1 vibe coding → Stage 2 spec-driven → Stage 3 harness → close) as beat/scene data consumed by the new engine, and register it in `talks.ts`.
- No backend changes: the talk is fully client-side, offline-capable, with no persistence requirement (state resets per session, matching the RPG talk's session-only pattern).

## Capabilities

### New Capabilities
- `talk-apparatus-engine`: The reusable, content-agnostic presentation engine — beat/scene timeline, block lifecycle, region behaviors, gauges/counters, gaze marker, and apparatus/non-apparatus scene-swap support. Framework-only; carries no knowledge of this specific talk's script.
- `ai-eng-dynamic-content`: The concrete "AI Eng Dynamic" talk — its scene/beat script (cold open, three stages, close) built on `talk-apparatus-engine`, plus registration as a new `apparatus` talk kind in `client-talks`.

### Modified Capabilities
(none — no existing capability specs exist yet for `client-talks`; this introduces its first formal specs)

## Impact

- **`client-talks/src/`**: new engine module (parallel to `talk-rpg/`), e.g. `talk-apparatus/`, containing the timeline/block/region/gauge/gaze primitives and a renderer.
- **`client-talks/src/talks.ts`**: extend `Talk.kind` to include `'apparatus'`; register the new talk entry.
- **`client-talks/src/pages/TalkPage.tsx`** (or equivalent): branch to render the apparatus engine when `kind === 'apparatus'`.
- **`docs/talks/ai-eng-dynamic/interactive-framework.md`**: source-of-truth concept doc this proposal formalizes; no changes expected but may be referenced/linked from design.md.
- No server, database, or API changes. No deploy-config changes expected (same static client build as existing `client-talks`), but confirm during design whether any Caddy/build entries need updating if a new route or asset path is introduced.
