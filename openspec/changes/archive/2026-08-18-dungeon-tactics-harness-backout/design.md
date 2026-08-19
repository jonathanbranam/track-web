## Context

See `proposal.md` — Why. This is a deletion-and-refiling change, so the only
things worth deciding up front are mechanical, and each is a trap the apply
phase would otherwise walk into.

## Goals / Non-Goals

**Goals:**

- Leave no dangling reference to the deleted catalog or skill.
- Move the melee and rogue requirement text with zero edits, so the archive
  diff shows a pure relocation.

**Non-Goals:**

- Removing or reworking the Gherkin runner, the `.feature` files, or the step
  definitions. They stay, frozen.
- Touching game code or `@repo/dungeon-engine`.

## Decisions

### Retired capabilities are deleted directly, not emptied by a delta

The first attempt wrote a `REMOVED Requirements` delta for each retiring
capability. `openspec archive` rejects that: removing a capability's *only*
requirements leaves a spec with none, and the rebuilt spec fails validation
("Spec must have at least one requirement"), aborting the whole archive.

So `openspec/specs/melee-archetype/`, `rogue-archetype/`,
`dungeon-tactics-step-catalog/`, and `dungeon-tactics-engineer-skill/` are
deleted outright, and this change carries exactly one delta — the ADDED
requirements landing in `pc-archetypes`. The reasons for each retirement live
in `proposal.md`, which is archived with the change, so the record survives
without a delta that cannot be applied.

### `pc-archetypes`'s Purpose is edited directly, not through the delta

A delta's `## Purpose` is ignored for an existing capability, so the ADDED
delta cannot fix the current text ("Defines the PC archetypes … other than
melee (which has its own dedicated `melee-archetype` capability)"). That
sentence is edited in `openspec/specs/pc-archetypes/spec.md` as its own task,
or the capability ends up describing a split that no longer exists.

### Requirement text moves verbatim

The melee and rogue requirement blocks in the ADDED delta were copied
programmatically from the source specs rather than retyped: 6 melee scenarios
and 4 rogue scenarios, unedited. Reviewing this change means confirming
nothing changed, which is only checkable if nothing did.

*Alternative — tidy the wording while moving:* rejected. Any edit made in the
same pass is indistinguishable from an accidental behavior change in review.
Rewording, if wanted, is a later change against a stable baseline.

### The catalog's README references are edited, not deleted wholesale

`features/README.md` documents the frozen Gherkin suite, which stays. Only the
sentences describing `steps-catalog.json` and its generator come out; the rest
of the file — including the frozen-status banner — is left alone.

## Risks / Trade-offs

- **A retirement leaves no machine-readable trace** → Deleting a capability
  directory is invisible to `openspec` tooling in a way a delta would not be.
  The compensating record is `proposal.md`'s Capabilities section, which names
  each retired capability and why, and the git history of the deletion itself.

- **A stale reference survives the deletion** → After deleting, grep for
  `steps-catalog`, `generate:step-catalog`, and `scenario-to-change`; the only
  remaining hits should be in archived changes and historical phase docs, which
  are records and stay as they are.

- **Removing the skill directory catches a neighbouring skill** →
  `.claude/skills/` holds other skills; only `scenario-to-change/` is removed,
  and the others are confirmed present afterward.

## Migration Plan

No runtime migration: nothing deployed changes and no data moves. Verification
is `npm test`, `npm run test:dungeon-tactics`, and `npm run build:games`, all of
which must pass exactly as they do today. Rollback is reverting the change.
