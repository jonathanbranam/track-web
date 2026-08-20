// Which host is running the engine: the shipped game, or the design bench in
// the sibling `harness` repo. A handful of sequencer operations (currently
// just `amendTelegraph`) are bench-only — a deliberate rule-break the game
// must never be able to reach — and this is the fence that keeps them so.
//
// Module-level rather than threaded through every call or carried on
// `GameState`: one process is either the game or the bench and it never
// changes at runtime, so passing it everywhere would be noise for no benefit.
// This mirrors the existing `defStore`/`contentStore` module-singleton shape.
// It is deliberately a different category from the board/unit-def state the
// harness has flagged for later instance-scoping (see
// `docs/dungeon-harness/harness-rebuild/turn-sequencer-plan.md` §6.1 in the
// sibling repo) — those need per-instance values for a multi-board survey
// grid, and the engine mode never will.
//
// Defaults to `'game'`, the conservative setting: a host that wants bench-only
// affordances must opt in explicitly, so forgetting to opt in fails closed
// rather than silently opening the game up.
//
// Tests exercising a bench-only operation MUST call `setEngineMode('bench')`
// in setup and restore it (`setEngineMode('game')`) in teardown — the same
// discipline `defStore`/`contentStore` tests already follow for their
// module-level state — so a forgotten reset can't leak into another test file.
export type EngineMode = 'game' | 'bench'

let mode: EngineMode = 'game'

export function getEngineMode(): EngineMode {
  return mode
}

export function setEngineMode(next: EngineMode): void {
  mode = next
}
