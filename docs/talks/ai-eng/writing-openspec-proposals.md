# Prompt: Writing an OpenSpec Proposal from the Phased Implementation

Use this doc when the task is "turn the next phase of the ADM talk into an
OpenSpec change." It's written as a runnable prompt/checklist, not narrative —
follow the steps in order.

## 1. Find the phase to implement

Read `phased-implementation.md` and locate the first unchecked phase in the
**Phase checklist** section (`- [ ] Phase N — ...`) that has no linked
in-progress OpenSpec change noted under its heading (see §4 below for the
link format).

- If exactly one such phase exists, treat it as the target — but still state
  which phase you picked and why before proceeding, so the user can redirect.
- If the previous phase's checkbox is unchecked or its linked change is not
  archived, **stop and confirm with the user** before starting the next
  phase out of order — phases are sequenced deliberately (see the "Why this
  ordering" note at the top of `phased-implementation.md`) and skipping ahead
  is a deliberate exception, not the default.
- If it's ambiguous which phase the user means (e.g. they asked for
  something that spans phases, or names a capability instead of a phase
  number), ask before drafting a proposal.

## 2. Gather the source material for that phase

For the target phase, read in this order:

1. **The phase's own Goals/Non-goals/Milestone** in `phased-implementation.md`
   — this is authoritative on *scope*: what this specific change does and
   does not include.
2. **`requirements.md`** — authoritative on *capability definitions*. Read:
   - The specific numbered section(s) the phase references (e.g. Phase 1
     points at §3 and §5; Phase 2 at §4B; Phase 8 at §4I).
   - §8 ("Candidate OpenSpec proposal boundaries") to see which capability
     grouping this phase falls under or splits from — `phased-implementation.md`
     itself calls out where phase scope diverges from a §8 grouping (Phase 6
     split from Phase 4; scene transitions split between Phase 2 and Phase 4).
   - §5 (action script / resting-state model) if the phase adds or changes
     any action — cross-check against `action-vocabulary.md` next.
3. **`action-vocabulary.md`** — if the phase's goals mention new or changed
   actions (e.g. Phase 1's `walk`/`pause`/`stop`/`say`, Phase 2's `walkTo`),
   confirm each one's current status here. This is the single source of
   truth for the action list — don't redefine an action inline in the
   proposal if it's already specified here; reference it instead.
4. **`architecture.md`** — technical implementation reference for the render
   stack, action executors, and precompute pass, if the phase touches
   rendering/Director internals. Note: this doc says the currently-shipped
   `client-talks/` scaffold still reflects an older forward-only model — do
   not assume `architecture.md` describes what's already built; verify
   against the actual code.
5. **`idea-board.md`** — only if the phase's scope brushes against a content
   fork (e.g. Phase 5's meter-vs-light-radius choice, Phase 7's achievement
   copy). Don't resolve a `FORK`/`PARKED` item yourself — the phase's
   non-goals usually already say the decision is out of scope; if not, ask.
6. **`CLAUDE.md`** (this folder) — re-check the authority/precedence notes at
   the top before citing any doc, in case it's been updated since you last
   read it.

Do not read `script.md` or `adm-talk-outline.md` unless the phase explicitly
touches beat content — they're narrative docs written against an older model
and are not authoritative for framework scope.

## 3. Draft the proposal

Use the standard OpenSpec change workflow (`new-change` skill, or
`propose-change` for a one-shot draft) to produce the usual artifact set —
`proposal.md`, `design.md`, spec deltas, `tasks.md` — scoped to exactly the
target phase's Goals/Non-goals. Do not fold in scope from adjacent phases
even if it looks convenient; that's what the non-goals section is for.

Naming: give the change directory a descriptive slug for the phase's
capability (e.g. `director-precompute-pass`, not `phase-1`) — phase numbers
shift if `phased-implementation.md` is resequenced, but the change directory
name shouldn't need to follow.

## 4. Link the in-progress change back into the phase doc

As soon as the change directory exists (before the proposal itself is even
drafted, if convenient — otherwise right after), edit
`phased-implementation.md`:

- Right after the phase's `**Status:**` line, add a line:
  `**OpenSpec change:** \`openspec/changes/<slug>/\``.
- Add a line right after that: `**Artifacts:** [ ] proposal · [ ] design ·
  [ ] specs · [ ] tasks` — one checkbox per artifact the schema tracks, in
  the same order `openspec status --change "<slug>" --json` lists them.

This is the marker future runs of this prompt check for in step 1 — don't
skip it, or the next invocation may re-propose a phase that's already
in flight.

### Keep the artifacts checklist and status in sync after every artifact

Don't wait until the change is fully drafted to update these — do it
immediately after **each** artifact (`proposal`, `design`, `specs`, `tasks`)
is created, in the same turn, not as a follow-up:

- Check off that artifact's box in the `**Artifacts:**` line.
- Recompute the status line from `openspec status --change "<slug>" --json`:
  - No artifacts done yet → `not started`.
  - Some but not all of the four done → `writing <artifact>`, where
    `<artifact>` is whichever one the JSON's `nextSteps`/`artifacts[].status
    == "ready"` names next — don't guess a fixed sequence, since `design`
    and `specs` can be unlocked in either order once `proposal` is done.
  - All four checked off, but `apply-change` work hasn't started → `ready to
    implement`.
  - `apply-change` work has begun (some `tasks.md` checkboxes ticked) →
    `implementing`.
  - Change archived → `complete` (see §5 below for the rest of that edit).

Getting this wrong in either direction breaks step 1 of this checklist: a
stale `writing specs` status when specs are actually done makes the phase
look further behind than it is, and a premature `ready to implement` before
tasks exist could invite `apply-change` work to start on an incomplete plan.

## 5. Update the phase doc on completion and archive

When the change is archived (via the `archive-change` skill):

- Check the phase's checkbox: `- [ ] Phase N` → `- [x] Phase N`.
- Update the status line to `**Status: complete**`.
- Update the `**OpenSpec change:**` line to point at the archived path
  (`openspec/changes/archive/<date>-<slug>/`) rather than removing it — this
  keeps a durable trail from phase to implementation.
- If the milestone as actually built diverged from the phase's written
  **Milestone** line, update the milestone text to match reality rather than
  leaving stale aspirational text.

Make this edit in the same session as the archive step, not as a follow-up —
otherwise the phase doc silently drifts out of sync with actual progress,
which is the failure mode this doc exists to prevent.
