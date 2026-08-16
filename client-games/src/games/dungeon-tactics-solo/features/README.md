# Gherkin scenarios for dungeon-tactics-solo

`.feature` files here run as ordinary Vitest tests via
[`@amiceli/vitest-cucumber`](https://vitest-cucumber.miceli.click/) — there is no
second test runner or CLI. Each `.feature` file pairs with a step-definition
file of the same base name plus `.feature.test.ts` (e.g. `melee-attack.feature`
+ `melee-attack.feature.test.ts`).

## Step-writing convention

- Step definitions build `GameState`/`UnitDef` inputs by hand (typically
  starting from `initialState()` in `../npc` and overriding `units`) and
  assert outcomes by calling `pc.ts`, `npc.ts`, and `turn.ts` functions
  directly against that in-memory state.
- Step definitions must **never** import `defStore.ts` or `contentStore.ts`
  directly. Both perform network I/O against track-web's own `/api`
  (`loadFromServer()`); calling that from a test would make it
  non-deterministic and dependent on a running server. `pc.ts`/`npc.ts`
  already import those stores internally for bundled-fallback data (unit
  stats, map layout) — that's fine, since it never hits the network unless
  `loadFromServer()` is called explicitly, which these tests never do.
- Step-definition files **must** use the `.test.ts` suffix, not `.spec.ts`.
  The repo root's `vitest.config.mts` only globs `client-games/src/**/*.test.ts`
  — a `.spec.ts` file here would silently never run.
