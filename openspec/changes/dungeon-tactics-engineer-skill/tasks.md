## 1. Skill scaffold

- [ ] 1.1 Create `.claude/skills/scenario-to-change/SKILL.md` with frontmatter
  (`name`, `description`, following the format used by
  `.claude/skills/propose-change/SKILL.md` and `.claude/skills/ff-change/SKILL.md`).
  Description should trigger on "turn a scenario handoff into a change" /
  "engineer skill" / mentions of a harness handoff bundle.
- [ ] 1.2 Write the input-handling step: accept a path to a handoff bundle
  directory; if not provided, ask the user for it via `AskUserQuestion`
  (don't guess at a path).
- [ ] 1.3 Write the validation step: confirm the bundle directory contains
  exactly one `<unit>.feature`, one `<unit>-changeset.json`, and one
  `<unit>-implementation-notes.md`; if any is missing, stop and report which
  file is missing (per the "Handoff bundle is missing a required file"
  scenario in `specs/dungeon-tactics-engineer-skill/spec.md`) rather than
  scaffolding a partial change.

## 2. Change scaffolding steps

- [ ] 2.1 Write the step that runs `openspec new change "<name>"` to create
  the change, deriving `<name>` from the unit (e.g. `dungeon-tactics-<unit>-movement`
  or similar — the skill should propose a name and let the engineer confirm).
- [ ] 2.2 Write the step that copies the bundle's `.feature` file verbatim
  into `openspec/changes/<change-id>/features/<unit>.feature` (byte-for-byte,
  per design.md's "copied verbatim, never rewritten" decision).
- [ ] 2.3 Write the capability-targeting step: search `openspec/specs/*/spec.md`
  for a `### Requirement:` whose title matches the unit name (e.g. `melee` →
  `pc-archetypes`'s "Melee PC archetype"); propose that capability with
  `MODIFIED Requirements` if found, or propose a new capability if not; and
  present the choice to the engineer via `AskUserQuestion` for confirmation
  or override before writing the `specs/` delta.
- [ ] 2.4 Write the step that drafts `proposal.md`/`design.md` (following
  `openspec instructions proposal`/`design`), including a design.md section
  that surfaces the handoff bundle's implementation-notes content verbatim
  under a labeled "Implementation notes from handoff" heading.
- [ ] 2.5 Write the step that drafts the `specs/<capability>/spec.md` delta,
  translating each `added`/`modified`/`removed` changeset scenario into the
  corresponding `ADDED`/`MODIFIED`/`REMOVED Requirements` scenario block,
  skipping `unchanged` scenarios (per the specs delta's requirements).
- [ ] 2.6 Write the step that drafts `tasks.md` with one stub task per
  `added`/`modified` changeset scenario, referencing the step definitions
  (and, where implementation notes flag a caveat, any engine change) it
  needs.

## 3. Verification against the real handoff bundle

- [ ] 3.1 Run the skill against the real `melee` handoff bundle at
  `harness/dungeon-harness-server/data/workspace/` (copy it into a scratch
  location first if the skill needs a track-web-local path — do not modify
  the harness repo's workspace files).
- [ ] 3.2 Confirm the resulting change's `features/melee.feature` matches
  the handoff bundle's `melee.feature` byte-for-byte.
- [ ] 3.3 Confirm the resulting `specs/` delta proposes `pc-archetypes` with
  `MODIFIED Requirements` extending "Melee PC archetype" (per design.md's
  Testing section), and that all six `added` changeset scenarios appear as
  scenario blocks.
- [ ] 3.4 Confirm `design.md` includes the friendly-unit-pathing caveat from
  `melee-implementation-notes.md` under a labeled section, and that it did
  not alter any scenario step text.
- [ ] 3.5 Run `openspec validate --change <resulting-change-id> --strict`
  and confirm it passes with no errors.
- [ ] 3.6 Delete or archive the scratch verification change once confirmed
  (it's a dry-run to validate the skill, not real melee-movement work to
  ship) — note in the PR/commit whether it was kept as the first real use
  of the skill instead.

## 4. Documentation

- [ ] 4.1 Add a short note to
  `docs/games/dungeon-tactics/dungeon-harness-phases/phase-07-trackweb-engineer-skill.md`
  marking phase 07 as implemented, once 1–3 above are complete, following
  the same status-line convention used on phase 02's doc.
