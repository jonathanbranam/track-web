---
name: scenario-to-change
description: Turn a harness-produced scenario handoff bundle (a signed-off .feature file, its changeset JSON, and implementation notes) into a scaffolded OpenSpec change. Use when the engineer has a handoff bundle from the harness repo's workspace and needs to convert it into a proper track-web OpenSpec change with a features/ delta, specs/ requirement delta, and tasks.md stubs.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: track-web
  version: "1.0"
---

Convert a harness handoff bundle into a scaffolded, reviewable OpenSpec
change — instead of hand-copying scenarios and hand-deriving requirement
deltas from the changeset.

A handoff bundle is a directory containing three files for one unit:
`<unit>.feature`, `<unit>-changeset.json`, `<unit>-implementation-notes.md`.
It is produced by the harness repo's designer workflow
(`dungeon-harness-server/data/workspace/`) and signed off before the
engineer ever sees it.

This skill drafts the change; it does not implement it. When it finishes,
normal `apply-change` → `archive-change` takes over unmodified.

**Input**: A path to a handoff bundle directory.

**Steps**

1. **Get the bundle path**

   If the user's request already includes a directory path, use it.
   Otherwise use the **AskUserQuestion tool** (open-ended, no preset
   options) to ask:
   > "What's the path to the handoff bundle directory?"

   Do not guess at a path.

2. **Validate the bundle**

   List the directory and confirm it contains exactly one file matching
   each of:
   - `*.feature`
   - `*-changeset.json`
   - `*-implementation-notes.md`

   All three filenames must share the same `<unit>` prefix (e.g. `melee`,
   `melee-changeset.json`, `melee-implementation-notes.md`). If any file is
   missing, **stop without creating anything** and report exactly which
   file is missing and what was found instead — don't scaffold a partial
   change.

   Read all three files now; you'll need them in every later step.

3. **Propose a change name**

   Derive a kebab-case name from the unit, e.g. `dungeon-tactics-<unit>-movement`
   or similar — pick a name that reflects what the changeset's `added`
   scenarios are actually about (skim their titles), not just the unit
   name. Present the proposed name to the engineer via **AskUserQuestion**
   for confirmation or override before creating anything.

   If a change with that name already exists, ask whether to continue that
   change or pick a different name — don't silently overwrite.

4. **Create the change**

   ```bash
   openspec new change "<name>"
   ```

   Then resolve its paths:

   ```bash
   openspec status --change "<name>" --json
   ```

   Use `changeRoot` from the output for every path below instead of
   assuming a repo-local layout.

5. **Copy the feature file verbatim**

   Copy the bundle's `<unit>.feature` byte-for-byte into
   `<changeRoot>/features/<unit>.feature` (create the `features/`
   directory if needed). Do not reformat, reword, or "clean up" anything in
   it — this is the literal contract the designer signed off on.

   Do **not** write to track-web's canonical
   `client-games/src/games/dungeon-tactics-solo/features/` tree. That tree
   is only updated later, when this change is archived.

6. **Propose a target capability**

   Search `openspec/specs/*/spec.md` for a `### Requirement:` heading whose
   title contains the unit name (case-insensitive), e.g. `melee` →
   `pc-archetypes`'s "Melee PC archetype".

   - If a match is found: propose that capability, with `MODIFIED
     Requirements` against the matching requirement.
   - If no match is found: propose a new capability (new `specs/<name>/spec.md`
     under the change) with `ADDED Requirements`.

   Present the proposed capability (and ADDED vs MODIFIED) to the engineer
   via **AskUserQuestion** for confirmation or override. Never write the
   `specs/` delta before this is confirmed — a wrong guess here is exactly
   the failure mode this step exists to catch.

7. **Draft proposal.md and design.md**

   ```bash
   openspec instructions proposal --change "<name>" --json
   openspec instructions design --change "<name>" --json
   ```

   Follow each `template`/`instruction` as usual (see "Artifact Creation
   Guidelines" below). In `design.md`, include a clearly labeled section —
   e.g. `## Implementation notes from handoff` — containing the bundle's
   `<unit>-implementation-notes.md` content verbatim (or near-verbatim;
   never summarize away specifics like caveats about current engine
   behavior). This section is informational only: it must not change what
   you write into `features/` or `specs/` in the steps above/below.

8. **Draft the specs/ delta**

   ```bash
   openspec instructions specs --change "<name>" --json
   ```

   For each scenario in the changeset JSON:
   - `status: "unchanged"` → skip it, no delta entry.
   - `status: "added"` → add it as a `#### Scenario` block under `## ADDED
     Requirements` (new capability) or under the relevant requirement's
     restated body under `## MODIFIED Requirements` (existing capability).
     Use the changeset scenario's `title` and Given/When/Then `steps`
     verbatim to build the scenario block — this is format conversion, not
     fresh authoring.
   - `status: "modified"` → same as `added`, but under the understanding
     that it replaces prior scenario text for that `scenarioId`.
   - `status: "removed"` → list under `## REMOVED Requirements`.

   When the target is `MODIFIED Requirements` against an existing
   requirement (per step 6), restate that requirement's **full** current
   text (SHALL statement + all existing scenarios) and then add the new/
   changed scenarios to it — OpenSpec's `MODIFIED Requirements` block is a
   full replacement of the requirement, not a diff. Read the current
   `openspec/specs/<capability>/spec.md` to get the existing text right.

9. **Draft tasks.md**

   ```bash
   openspec instructions tasks --change "<name>" --json
   ```

   Add at least one stub task per `added`/`modified` changeset scenario,
   naming the step definitions it needs (in
   `client-games/src/games/dungeon-tactics-solo/features/<unit>.feature.test.ts`,
   per the `dungeon-tactics-gherkin-runner` capability's convention — engine
   calls only, no `defStore`/`contentStore`). Where the implementation
   notes flag a caveat (e.g. current engine behavior not yet matching a new
   scenario), add a separate task for the engine change it implies — do
   not fold that into a step-definition task, so a human explicitly decides
   to do it.

10. **Show final status**

    ```bash
    openspec status --change "<name>"
    ```

    Summarize for the engineer: change name and location, capability
    targeted (and whether ADDED or MODIFIED), how many scenarios were
    added/modified/removed/skipped, and that it's ready for `apply-change`
    review.

**Artifact Creation Guidelines**

- Follow the `instruction` field from each `openspec instructions` call.
- `context` and `rules` in that output are constraints for you, not
  content — never copy `<context>`/`<rules>`/`<project_context>` blocks
  into the drafted files.
- Use `template` as the structure for each file; fill in its sections.
- Verify each artifact file exists after writing it before moving on.

**Guardrails**

- Never write a partial change: if the bundle is invalid (step 2), stop
  before running `openspec new change`.
- Never guess the capability silently: always confirm via AskUserQuestion
  (step 6) before writing the `specs/` delta.
- Never let implementation notes alter `.feature` or `specs/` content —
  they are advisory only and belong solely in `design.md`.
- Never write to the canonical `client-games/.../features/` tree — only to
  the change's own `features/` delta directory.
- This skill drafts a change; it does not implement step definitions or
  engine changes, and it does not run `apply-change` or `archive-change`.
