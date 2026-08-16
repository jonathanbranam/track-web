## Context

See proposal.md - Why. Relevant existing state:

- `@amiceli/vitest-cucumber` (`^4.7.0`) is already a devDependency of `client-games` (added by phase 02, `dungeon-tactics-gherkin-runner`). It ships its own internal Gherkin parser — no `@cucumber/gherkin` or other parsing dependency is present or needed.
- Its public API exposes `loadFeature(featureFilePath): Promise<Feature>`. `Feature extends ScenarioParent`, which exposes `.scenarii: Scenario[]`, `.rules: Rule[]` (each `Rule` is itself a `ScenarioParent`), and `.background: Background | null`. Each `Scenario`/`Background` is a `StepAble` exposing `.steps: Step[]`. Each `Step` has `type: StepTypes` (`'Given' | 'When' | 'Then' | 'And' | 'But'`) and `details: string` (the raw step text after the keyword).
- Critically, `And`/`But` steps do not carry their own semantic keyword — in Gherkin they inherit whichever concrete keyword (Given/When/Then) precedes them in the same step list. The parser preserves this literally (`type` is `'And'`/`'But'`, not resolved), so the catalog generator must resolve each step's *effective* keyword itself by tracking the last-seen Given/When/Then while iterating a step list in order.
- Phase 02's example scenario (`melee-attack.feature` + `melee-attack.feature.test.ts`) does not exist in the working tree yet — phase 02's `tasks.md` is unimplemented (all items unchecked) even though its planning artifacts are marked complete and its `@amiceli/vitest-cucumber` devDependency addition is already present, uncommitted, in `client-games/package.json`. This change's spec Requirement "Catalog generation is verified against real scenario content" therefore depends on phase 02 having been implemented first — see Migration Plan.

## Goals / Non-Goals

**Goals:**
- Produce a correct, deterministic, mechanically-derived catalog from whatever `.feature` files exist at generation time, using `loadFeature()` rather than hand-rolling Gherkin parsing.
- Correctly resolve `And`/`But` steps to their effective Given/When/Then keyword, since the catalog's value depends on grouping by real semantic meaning, not literal keyword text.
- Keep the script a plain dev-time Node/tsx script with no runtime footprint in the shipped client bundle.

**Non-Goals:**
- A Markdown rendering of the catalog (the phase doc calls this a "cheap optional add-on"; not needed for the harness repo's phase 06 consumer, which reads JSON — deferred).
- A pre-test hook or CI staleness check (deferred per proposal — manual/on-demand is the v1 default).
- Any change to how `.feature` files are authored or organized (that's phase 02's and phase 08's concern).
- Deduplicating step text that differs only cosmetically (e.g. trailing whitespace, punctuation) beyond exact string match after trimming — semantic/fuzzy matching is out of scope.

## Decisions

### Use `loadFeature()` directly instead of a custom parser
`loadFeature()` is already exercised by every step-definition file (phase 02's convention) and returns a fully-parsed `Feature` model (scenarios, rules, backgrounds, steps) with no separate dependency. Writing or importing a second Gherkin parser (e.g. `@cucumber/gherkin`, considered in the phase doc as a fallback) would duplicate parsing logic already present and tested inside `@amiceli/vitest-cucumber`, and risks disagreeing with it on edge cases (e.g. rule handling). Decision: import `loadFeature` from `@amiceli/vitest-cucumber` in the generator script; no new dependency.

### Walk scenarios, rules, and backgrounds; resolve `And`/`But` to the preceding concrete keyword
For each `.feature` file: collect steps from `feature.background` (if present), every `feature.scenarii[].steps`, and recursively every `rule.background` + `rule.scenarii[].steps` for each `feature.rules[]`. Within each individual step list, iterate in order and track `lastConcreteKeyword`, initialized per list (background counts as its own list, each scenario its own list — Gherkin semantics don't carry the "current keyword" across a background into a scenario's own first step if that step is itself a concrete Given/When/Then, which it always is by grammar). When a step's `type` is `And` or `But`, file its `details` under `lastConcreteKeyword` instead of literally "And"/"But"; when it's `Given`/`When`/`Then`, update `lastConcreteKeyword` and file under itself.
Alternative considered: catalog `And`/`But` steps under their own literal keyword. Rejected — it would silently produce a catalog where two textually-adjacent steps like `Given a unit\nAnd it has 10 HP` show up under unrelated buckets ("Given" and "And"), which is useless for the harness repo's vocabulary-reuse check (phase 04's whole purpose).

### Deduplicate by (effective keyword, trimmed step text) after full traversal
Collect all `(keyword, details)` pairs across every file first, then dedupe via a `Map` keyed on `` `${keyword}::${details.trim()}` ``, before building the final grouped JSON. This is simpler and less error-prone than deduplicating per-file or streaming, and the catalog is small (bounded by however many `.feature` files exist) so building it fully in memory is not a performance concern.

### Output shape: `{ given: string[], when: string[], then: string[] }`, each list sorted
Lowercase-keyed, alphabetically-sorted arrays keep the JSON diff-friendly across regenerations (the proposal's stated reason for choosing JSON) — an unsorted list would reorder on every regeneration based on file-walk order, producing noisy diffs unrelated to actual content changes. Sorting is the cheapest way to make the output stable without tracking file/scenario provenance, which nothing downstream needs yet.
Alternative considered: preserve file/scenario provenance per step (e.g. `{ text, sourceFile, sourceScenario }`). Rejected for v1 — the proposal's stated consumer (harness phase 06) only needs "does this text already exist," not where; provenance can be added later as a non-breaking additive field if a real need appears.

### Script location and invocation: `client-games/scripts/generate-step-catalog.ts` run via `tsx`
Matches the phase doc's suggested path. `client-games` has no existing `scripts/` directory or script-running convention of its own (its `package.json` `scripts` block only has `dev`/`build`/`preview`), but the repo root already uses `tsx` for `npm run dev` (see root CLAUDE.md: "Development (backend only — tsx watch)"), so reusing `tsx <path>` for a one-off dev script is consistent with an existing project pattern rather than introducing a new one. Add `"generate:step-catalog": "tsx scripts/generate-step-catalog.ts"` to `client-games/package.json`'s `scripts` block.

## Risks / Trade-offs

- **[Risk]** `@amiceli/vitest-cucumber`'s `Feature`/`Step` model shape could change in a future version bump, silently breaking the generator (e.g. renamed fields). → **Mitigation:** the devDependency is already pinned (phase 02); this change doesn't loosen that pin. The end-to-end verification step (regenerating against a real scenario) would also catch a shape mismatch immediately as an empty or malformed catalog.
- **[Risk]** The `And`/`But` resolution logic is the one piece of real logic in an otherwise mechanical script; getting the per-list keyword tracking wrong (e.g. not resetting between scenarios) would silently mis-bucket steps without erroring. → **Mitigation:** the spec's "Catalog reflects the existing example scenario" scenario is exactly the regression check for this; keep the example `.feature` file (once phase 02 lands it) containing at least one `And` step so this path is exercised, not just bare Given/When/Then.
- **[Risk]** This change's verification step (spec requirement "Catalog generation is verified against real scenario content") requires phase 02's example `.feature` file to exist, but phase 02's `tasks.md` is currently unimplemented. → **Mitigation:** see Migration Plan — sequence phase 02's implementation before this change's task 4 (verification), or verify against a throwaway test fixture and re-verify once phase 02 lands. Either is compatible with these specs since they describe the generator's required behavior, not phase ordering.

## Migration Plan

No runtime migration (dev-tooling only, no deployed service or data model). Sequencing note: this change's own tasks (script + npm script + spec-level requirements) can be implemented immediately, but the end-to-end verification task depends on phase 02's example `.feature` file existing in the working tree. If phase 02 is not yet implemented when this change's tasks are picked up, implement phase 02's `tasks.md` first (it's already fully speced and designed, just not built), then return to this change's verification task.
