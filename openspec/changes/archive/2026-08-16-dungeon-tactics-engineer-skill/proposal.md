## Why

The dungeon-harness plan splits scenario work into two roles: a designer
authoring Gherkin `.feature` files in a separate `harness` repo, and an
engineer (in track-web) turning a signed-off handoff bundle — `.feature`
files + a structural changeset + advisory implementation notes — into a
proper OpenSpec change. That hand-off currently has no track-web-side
tooling: an engineer would have to hand-copy `.feature` files, hand-derive
`ADDED`/`MODIFIED`/`REMOVED` requirement deltas from the changeset, and
hand-write `tasks.md` stubs for every unit's scenario batch. A real handoff
bundle now exists (produced by harness phase 06, for the `melee` unit) to
build and verify this against, so the skill can be built and validated
end-to-end now rather than speculatively.

## What Changes

- Add a new Claude Code skill, `scenario-to-change`
  (`.claude/skills/scenario-to-change/SKILL.md`), used by the engineer
  inside track-web to turn a harness handoff bundle into an OpenSpec change.
- The skill takes a path to a handoff bundle directory (containing
  `<unit>.feature`, `<unit>-changeset.json`, `<unit>-implementation-notes.md`,
  copied or pointed to from the harness repo's
  `dungeon-harness-server/data/workspace/`) and:
  - Scaffolds a new OpenSpec change via `openspec new change`.
  - Copies the handoff `.feature` file into the new change's own
    `features/` delta directory (not track-web's canonical
    `client-games/src/games/dungeon-tactics-solo/features/` tree — that only
    updates when the change archives).
  - Drafts `proposal.md`/`design.md`, using the changeset's
    added/modified/removed classification to fill in the `specs/` delta's
    `ADDED`/`MODIFIED`/`REMOVED Requirements` blocks (format conversion, not
    fresh authoring), and surfacing the implementation notes as a design.md
    callout rather than silently applying their suggestions.
  - Produces `tasks.md` stubs for implementing the corresponding
    `@amiceli/vitest-cucumber` step definitions and any engine changes the
    implementation notes flag as needed.
- After the skill runs, normal `apply-change` → `archive-change` takes over
  unmodified; `archive-change` is what actually merges the change's
  `features/*.feature` into the canonical `features/` tree and triggers
  phase 04's `generate:step-catalog` regeneration (a manual step for now —
  wiring that into `archive-change` itself is out of scope for this change).

## Capabilities

### New Capabilities
- `dungeon-tactics-engineer-skill`: a `.claude/skills/` skill that converts
  a harness-produced scenario handoff bundle (`.feature` + changeset +
  implementation notes) into a scaffolded OpenSpec change with a matching
  `features/` delta, `specs/` requirement delta, and `tasks.md` stubs.

### Modified Capabilities
(none — this introduces a new skill only; it does not change the behavior
of the existing Gherkin runner or step-catalog generator capabilities)

## Impact

- New file: `.claude/skills/scenario-to-change/SKILL.md` (plus any small
  helper script it needs — see design.md).
- No changes to runtime app code, routes, or build/deploy files: this is
  engineer-facing tooling only, not a shipped app feature. No Caddyfile /
  `server-deploy.sh` / `dev-local.sh` / `openapi.yaml` updates needed.
- Consumes, read-only: the existing handoff bundle shape already produced
  by the harness repo's `dungeon-baseline-changeset` capability (`.feature`,
  `<unit>-changeset.json`, `<unit>-implementation-notes.md`).
- Downstream of this change: `archive-change` on any OpenSpec change this
  skill produces is what actually lands scenarios into the canonical
  `client-games/src/games/dungeon-tactics-solo/features/` tree.
