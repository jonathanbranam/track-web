## Context

See proposal.md - Why. This is phase 07 of the `dungeon-harness` plan
(`docs/games/dungeon-tactics/dungeon-harness-phases/phase-07-trackweb-engineer-skill.md`);
full design rationale for the two-repo handoff lives in the sibling
`harness` repo's `docs/dungeon-harness/proposal.md`.

A real handoff bundle already exists (produced by harness phase 06) at
`harness/dungeon-harness-server/data/workspace/`: `melee.feature`,
`melee-changeset.json`, `melee-implementation-notes.md`. This change was
authored and is meant to be validated directly against that bundle.

track-web's existing capability spec for unit behavior is `pc-archetypes`
(`openspec/specs/pc-archetypes/spec.md`) — it already has a "Melee PC
archetype" requirement covering move range, attack targeting, damage, and
color. The `melee` handoff bundle's new scenarios (four-square movement,
enemy/friend pathing blocking, water terrain) extend that existing
requirement rather than describing a new capability.

## Goals / Non-Goals

**Goals:**
- A skill an engineer runs once per handoff bundle to get a complete,
  reviewable OpenSpec change draft — not a fully automated pipeline that
  skips review.
- Faithful, literal transfer of the signed-off `.feature` content into the
  change's `features/` delta — the skill must not silently edit scenario
  wording.

**Non-Goals:**
- Fully automating `apply-change`/`archive-change` or step-definition
  implementation — this skill only drafts the change; implementing the
  step definitions and any engine changes is normal follow-up `apply-change`
  work (tracked as tasks.md stubs, not done by this skill).
- Wiring step-catalog regeneration into `archive-change` — the proposal
  notes this as a manual step for now, out of scope here.
- Automating the harness-side sign-off flow or the read-only path
  configuration — those are phase 06 (harness repo), already built.

## Decisions

- **Skill format: instructions-only `SKILL.md`, no helper script.**
  Parsing `<unit>-changeset.json` (already-structured JSON) and rendering
  Gherkin text back out is well within what an LLM can do directly by
  reading the files — no need for a bespoke parser. This matches the
  existing style of this repo's own OpenSpec skills
  (`propose-change`, `ff-change`, etc.), which are pure instructions
  driving the `openspec` CLI, not scripts.
  - Alternative considered: a Node/TS helper script (mirroring
    `client-games/scripts/generate-step-catalog.ts`'s mechanical approach)
    to parse the changeset and pre-fill artifact templates. Rejected for
    v1 — the changeset's `added`/`modified`/`removed` scenarios still need
    engineer judgment to map onto capability requirements (see next
    decision), so a script would only save the mechanical copy step while
    adding a second thing to maintain. Worth revisiting if this skill runs
    often enough that the manual copy step becomes the bottleneck.
- **`.feature` content is copied verbatim, never rewritten.** The skill
  copies the handoff bundle's `.feature` file byte-for-byte into
  `openspec/changes/<change-id>/features/<unit>.feature`. This guarantees
  what gets implemented and tested is exactly what the designer signed off
  on — matching the harness proposal's "Gherkin wins, always" principle
  and the "track-web-side edits to a landed scenario should be rare" norm.
- **Capability targeting requires engineer confirmation, not full
  automation.** The changeset only classifies scenarios as
  added/modified/removed relative to the *Gherkin* baseline — it has no
  opinion on which OpenSpec capability (`pc-archetypes`, `npc-archetypes`,
  or a new capability) the resulting requirement delta belongs under. The
  skill SHALL propose a target capability (default heuristic: match the
  unit name against existing `### Requirement:` titles in
  `openspec/specs/*/spec.md`, e.g. `melee` → `pc-archetypes`'s "Melee PC
  archetype") and use `MODIFIED Requirements` against that capability when
  a matching requirement exists, but SHALL surface this choice for the
  engineer to confirm or override before finalizing the `specs/` delta —
  never silently guess wrong and bury it in a change nobody reviews.
- **Implementation notes are advisory only, never applied automatically.**
  Per the harness proposal's "harness → engineer: implementation notes
  (advisory)" row, the skill surfaces note content as a labeled section in
  `design.md` and nowhere else. It does not, for example, add or remove
  scenario steps based on notes, or "fix" the `.feature` content to match
  a caveat the notes raise (e.g. today's board tool not yet being
  faction-aware) — that becomes a `tasks.md` follow-up item instead, so a
  human decides whether to change scenario behavior or fix the engine.

## Risks / Trade-offs

- **[Risk]** Capability-matching heuristic guesses wrong (e.g. treats a
  genuinely new capability as a match for an unrelated existing one, or
  vice versa) → **Mitigation:** the skill always surfaces its proposed
  capability choice for engineer confirmation before writing the `specs/`
  delta (see Decisions above); this is a draft-and-review tool, not a
  fire-and-forget pipeline.
- **[Risk]** A handoff bundle's changeset references a unit with no
  existing canonical `.feature` file (first-ever scenarios for that unit)
  → **Mitigation:** in that case all scenarios are `added` against an
  empty baseline (matches harness phase 06's documented empty-baseline
  case) and the skill defaults to proposing a new capability rather than
  hunting for a non-existent match.
- **[Risk]** Bundle directory has stale or partial files (e.g. changeset
  present but `.feature` missing) → **Mitigation:** covered by the specs
  delta's "Handoff bundle is missing a required file" scenario — the skill
  refuses to scaffold a partial change.

## Testing

Validated directly against the real `melee` handoff bundle in
`harness/dungeon-harness-server/data/workspace/` (not a synthetic
fixture): running the skill against it should scaffold a change whose
`features/melee.feature` matches that bundle's `.feature` file verbatim,
whose `specs/pc-archetypes/spec.md` delta contains a `MODIFIED
Requirements` block extending "Melee PC archetype" with the six new
scenarios, and whose `design.md` surfaces the friendly-unit-pathing caveat
from `melee-implementation-notes.md`. See tasks.md for the concrete
verification task.
