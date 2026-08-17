**App**: all (engineering tooling)

## Purpose

Lets the engineer, working inside track-web with Claude Code, turn a
harness-produced scenario handoff bundle (a signed-off `.feature` file, its
structural changeset, and advisory implementation notes) into a scaffolded,
reviewable OpenSpec change — instead of hand-copying scenarios and
hand-deriving requirement deltas from the changeset.

## Requirements

### Requirement: Skill scaffolds an OpenSpec change from a handoff bundle
The system SHALL provide a `.claude/skills/scenario-to-change` skill that,
given a path to a handoff bundle directory containing a `<unit>.feature`
file, a `<unit>-changeset.json` file, and a `<unit>-implementation-notes.md`
file, scaffolds a new OpenSpec change (`proposal.md`, `design.md`,
`tasks.md`, and a `specs/` delta) using the existing `openspec new change`
workflow.

#### Scenario: Running the skill against a real handoff bundle
- **WHEN** the engineer invokes the skill with a path to a handoff bundle
  directory that contains a unit's `.feature` file, changeset JSON, and
  implementation notes
- **THEN** the skill creates a new OpenSpec change directory under
  `openspec/changes/` containing a drafted `proposal.md`, `design.md`,
  `tasks.md`, and at least one `specs/<capability>/spec.md` delta file

#### Scenario: Handoff bundle is missing a required file
- **WHEN** the engineer invokes the skill with a path that is missing the
  changeset JSON or the `.feature` file
- **THEN** the skill stops without creating a partial change and reports
  which file is missing, rather than scaffolding an incomplete change

### Requirement: Feature file lands in the change's own features/ delta directory
The system SHALL copy the handoff bundle's `.feature` file into the new
change's own `openspec/changes/<change-id>/features/` directory. The skill
SHALL NOT write directly into track-web's canonical
`client-games/src/games/dungeon-tactics-solo/features/` tree — that tree
only updates when the resulting change is later archived.

#### Scenario: Feature file is copied into the change delta, not canonical
- **WHEN** the skill scaffolds a change from a handoff bundle
- **THEN** the bundle's `.feature` file is written to
  `openspec/changes/<change-id>/features/<unit>.feature`
- **AND** no file under `client-games/src/games/dungeon-tactics-solo/features/`
  is created or modified by the skill

### Requirement: Requirement delta is derived from the changeset classification
The system SHALL derive each `ADDED`/`MODIFIED`/`REMOVED Requirements`
scenario entry in the change's `specs/` delta directly from the handoff
bundle's changeset JSON, mapping each changeset scenario's `added` /
`modified` / `removed` status to the corresponding OpenSpec delta section,
and each changeset scenario's title and steps to that entry's `#### Scenario`
block.

#### Scenario: Added changeset scenario becomes an ADDED requirement scenario
- **WHEN** the changeset JSON classifies a scenario as `added`
- **THEN** the drafted `specs/` delta includes that scenario under an
  `## ADDED Requirements` section, with a `#### Scenario` block reflecting
  the scenario's title and Given/When/Then steps

#### Scenario: Unchanged changeset scenario is not included in the delta
- **WHEN** the changeset JSON classifies a scenario as `unchanged`
- **THEN** the drafted `specs/` delta does not include a delta entry for
  that scenario

### Requirement: Implementation notes surface as a design callout, not silent changes
The system SHALL include the handoff bundle's implementation notes content
in the drafted `design.md` as an explicit, clearly-labeled callout, and
SHALL NOT use the notes to silently alter the scenario content copied from
the `.feature` file or the requirement delta derived from the changeset.

#### Scenario: Implementation notes appear in design.md
- **WHEN** the handoff bundle's implementation-notes file contains
  suggestions (e.g. a caveat about current engine behavior not yet matching
  a new scenario)
- **THEN** the drafted `design.md` includes that content under a clearly
  labeled section (e.g. "Implementation notes from handoff")
- **AND** the scenario steps copied into `features/` and the `specs/` delta
  are unchanged by the notes' content

### Requirement: Tasks stub covers step-definition work per new/modified scenario
The system SHALL produce a `tasks.md` with a stub task for implementing or
updating the `@amiceli/vitest-cucumber` step definitions needed by each
`added` or `modified` scenario in the changeset.

#### Scenario: Tasks stub lists step-definition work for each added scenario
- **WHEN** the changeset contains one or more scenarios classified as
  `added` or `modified`
- **THEN** the drafted `tasks.md` includes at least one task per such
  scenario referencing the step definitions it needs
