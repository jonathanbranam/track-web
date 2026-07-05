# Scene J — Close: back to the fear

Source: `../adm-talk-story-board-01.md`, Beats 24–25 (Scene J, the talk's final scene).
Script: `client-talks/src/talk-rpg/scripts/scene-j.json` (plain `Action[]`, standalone — precomputes independently via `initialSceneId: 'world-town'`) — the actual script lives there, not in this folder; see `CLAUDE.md` in this folder for why.

## Currently working

Both beats are fully expressible with actions already **Established** in
`../action-vocabulary.md` — nothing new needed in the engine:

| Beat | Actions used |
|---|---|
| 24 — The town needs warriors | `walkTo`, `startDialogue`/`say`/`endDialogue` ×3 |
| 25 — To be continued | `partyJoin` ×4, `showOverlay(kind: 'title')` ×2, `pause`, `stop` |

- `town-square` is a real named location on `world-town` (`(4, 2)`, per `world-town.json`'s object layer), so `walkTo(pc, "town-square")` needs no new map data.
- Beat 24 is `pause: no`, so it auto-chains straight into Beat 25 with no `stop` in between — matches the storyboard.
- Beat 25 is `pause: yes (end)` — the true final checkpoint of the whole talk — so the script ends on a single `stop` after the closing overlay.
- `showOverlay` is a single independent slot (one card at a time), so the "title reprise → TO BE CONTINUED" transition in the storyboard's `Screen` field is just two sequential `showOverlay(kind: 'title')` calls with the text swapped, no `hideOverlay` needed in between — same precedent as `scene-a.json`'s three headline cards.
- Only the storyboard's `Screen:` field became authored actions; the `Say:` fields (the presenter's own spoken narration, e.g. "The dread I opened with was real...") are never rendered on screen and are not represented as `say`/`startDialogue` actions — same precedent as `scene-a.md`.

## Needs additional definition (content, not engine work)

- **Horthy naming choice — a concrete call made here, flagged as a cross-scene `[FORK]`.** The storyboard's own header states "Horthy placement (SDD bookend) left as `[FORK]` at Beat 12 vs. Beat 24," and Beat 12's own note says its default is to stay **unattributed** ("the veterans") there, deferring the option to name him to this scene. Per the assignment, I've made the concrete call **here**: Beat 24 now includes a third dialogue exchange with `speaker: "Horthy"` delivering a line close to the storyboard's suggested reversal — *"I wasn't the only one who learned to read the code."* This directly answers Beat 24's own inline note (`[FORK: name Horthy's reversal here...]`).
  - **Reconciliation needed with Scene E.** Scene E (Beat 12) is authored by a parallel sibling agent I could not coordinate with live. This scene assumes Scene E followed the storyboard's stated default and left Beat 12's veteran **unattributed**. *(Incidental note: at the time of writing, `client-talks/src/talk-rpg/scripts/scene-e.json` already existed in the repo — its speaker is `"Veteran"`, unattributed — which is consistent with the assumption above and means no rename is needed today. Flagging this as a reconciliation item regardless, since a follow-up centralized wiring step should double check this: if Scene E is ever revised to name the veteran, e.g. as "Yegge" or "Horthy" himself, that would either conflict with or need to be tied back into this scene's reveal.)*
  - If Scene E's veteran and Scene J's `Horthy` are meant to be **the same NPC** (a bookend reveal — "the veteran from Beat 12 was Horthy all along"), that identity link is not encoded anywhere in either script (no shared entity id — Scene E never names an entity, it only opens a `startDialogue` with a `speaker` string). That's a real gap: `startDialogue`/`say` carry no NPC/entity reference beyond the cosmetic `speaker` label (see `action-vocabulary.md`'s note on "no NPC/entity reference otherwise — one global dialogue state"), so nothing currently threads "the Beat 12 veteran" and "the Beat 24 Horthy" together beyond authorial intent and matching narration. Acceptable for now (matches the `[FORK]`'s open status), but worth a deliberate decision once both scenes are reconciled.
- **Villager speaker labels — placeholder, my call.** The storyboard only says "villagers crowding with pleas" with two quoted lines and no names. I used two distinct speaker labels, `"Villager"` and `"Grieving Mother"`, to keep the two pleas visually/narratively distinct in the dialogue box. Any other labeling (e.g. `"Townsfolk"` ×2, or the asset checklist's generic "townsfolk ×3") would work equally well — flagging as a naming placeholder, not a blocking one.
- **Title text — resolves Scene A's placeholder, needs reconciliation there.** `scene-a.md` flags its title text as **blocking**: `scene-a.json` currently uses the literal trademark `"DRAGON WARRIOR"` as a stand-in, with no fictional in-world title decided. Beat 25's storyboard `Screen` field, unusually, spells out an exact string for the title-reprise card: *"Software Engineering Skills Are More Important Than Ever"* — i.e., the talk's own real title, shown once, as the closing punchline that ties the fantasy game and the real talk together (a deliberate, one-time break from "zero software vocabulary on screen," since it's the final card of the whole show). I've used that exact string as the `text` for Beat 25's first `showOverlay(kind: 'title')` call in `scene-j.json`.
  - **Reconciliation item:** this strongly suggests Scene A's placeholder `"DRAGON WARRIOR"` should eventually be replaced with the same resolved title text (or a fantasy-styled variant of it) so the cold-open title and the closing "title reprise" actually match — right now they don't (Scene A says `"DRAGON WARRIOR"`, Scene J says the talk's real title). Flagging this explicitly since it's a two-file drift that should be fixed together whenever the title is finalized, not something Scene J alone can resolve.
- **`familiar-1`..`familiar-4` id convention — placeholder, my call.** Since this scene must precompute standalone (no assumed carryover from Scene H/the climax), I invented a generic sequential id convention (`familiar-1`, `familiar-2`, `familiar-3`, `familiar-4`) for the four-familiar party reintroduced via `partyJoin`. This is very likely **not** the id convention Scene G (training ground, Beat 17's four role-differentiated familiars) or Scene H (the Dragonlord climax) actually use. Reconciliation needed once those scenes/the centralized wiring step settles on real ids — at minimum the ids should probably reflect the four distinct roles from Beat 17 rather than being anonymous, once that's known.
- **All four `partyJoin` calls omit `at` and default to `pc`'s current position (`town-square`), so all four familiars visually stack on the same tile.** This is a known placeholder visual limitation, not a blocker: thematically it roughly matches "hero at the head of the party" (a tight cluster behind the hero), but `partyJoin` has no ordered fan-out/offset positioning for several simultaneous joins, and `town-square`'s map only has three named locations total (`town-square`, `shrine`, `overworld-gate`) — not enough distinct spots for four familiars even if we wanted to spread them out, without adding new named locations to `world-town.json` (out of scope for this scene per the constraints). If a cleaner formation is wanted later, that's map/engine work, not something this script can fix alone.
- **Hold timing for the closing card.** `pause: 3` seconds between the title-reprise card and "TO BE CONTINUED" is a placeholder, untimed against the actual spoken close ("Typing was never the valuable part...").
- **Horthy's dialogue line wording.** Used verbatim from the storyboard's inline fork note (*"I wasn't the only one who learned to read the code"*) — the storyboard itself doesn't mark this line `[VERIFY]`, but it's a late addition/reversal line and may want a final wording pass alongside the rest of Beat 12/24's fork resolution.

## Needs additional engine work

None. Everything above is a content decision, not a missing capability.

## Wiring it in

Not yet registered — per the assignment, a follow-up centralized step registers
all scenes at once in `SCRIPTS` (`client-talks/src/talk-rpg/scripts/index.ts`).
Intended registry entry:

```ts
{ id: 'scene-j', name: 'Scene J — Close: Back to the Fear', actions: sceneJ as Action[], initialSceneId: 'world-town' }
```

`client-talks/src/talk-rpg/scripts/scene-j.json` exists and is playable/precomputable
standalone today (`runPrecompute(actions, MAPS, 'world-town')`); only the
`index.ts`/`index.test.ts` registration step remains, intentionally deferred.

## Open forks to reconcile (summary)

- **Horthy naming (Beat 12 vs. 24):** resolved *in this scene* per the storyboard's stated default (unattributed at 12, named here at 24) — needs a final check against however Scene E actually landed, and a decision on whether Scene E's veteran and this scene's `Horthy` are meant to be the same character (no shared id currently links them).
- **Title text (Scene A vs. Scene J):** Scene A's placeholder (`"DRAGON WARRIOR"`) and Scene J's resolved closing title (the talk's real title, per Beat 25's `Screen` field) currently don't match — reconcile both to the same final title once decided.
- **Familiar id convention:** `familiar-1..4` here vs. whatever ids Scene G/H settle on for the four role-differentiated familiars — reconcile once known.
