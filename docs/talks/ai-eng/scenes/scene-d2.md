# Scene D2 — Stage 1: Vibe coding (it forgets the battle → death)

Source: `../adm-talk-story-board-01.md`, Beats 10–11 (second half of Scene D).
Script: `client-talks/src/talk-rpg/scripts/scene-d2.json` (plain `Action[]`) —
the actual script lives there, not in this folder; see `CLAUDE.md` in this
folder for why.

**Split note.** Beats 6–11 were originally authored as one continuous
`scene-d` file (75 actions) — noticeably larger than every other scene — and
have been split at the storyboard's own first `stop` checkpoint (end of Beat
9) into [**Scene D1**](./scene-d1.md) (Beats 6–9) and **Scene D2** (this
file, Beats 10–11). Every scene in this project is authored standalone (its
own script gets `runPrecompute`'d independently, never assuming another
scene's script ran first), so this file **cannot simply continue** Scene
D1's in-progress battle — it opens by re-establishing that exact mid-battle
resting state itself (see "Opening re-establishment block" below), then
proceeds with Beats 10–11 unchanged from the original single-file version.

## Currently working

Both beats are expressible with actions already **Established** in
`../action-vocabulary.md` — nothing new needed in the engine. Beat 10
(`pause: no`) auto-chains into Beat 11 (`pause: yes`), which ends with a
`stop` — the scene's single click-to-advance point, and the true end of
Stage 1.

| Beat | Actions used |
|---|---|
| *(opening bridge, not a storyboard beat)* | `startBattle` (re-establishes `pc`/`familiar` vs. `bug-slime-1/2/3` at Scene D1's ending HP values), `setMeter` (`mp`, `gold` at Scene D1's ending values), `showOverlay(kind:'act-card')` + `showAchievement` (restores Beat 9's still-showing card/toast) |
| 10 — It forgets the battle | `hideOverlay`, `hideAchievement`, `battleAction` (enemy hits pc), `addMeter` (mp → 0), `tagCombatant('needs-attention')`, `startDialogue`/`say(speaker: 'familiar')` |
| 11 — Death | `endDialogue`, `battleAction` (killing blow), `endBattle(outcome: 'defeat')`, `defeatSequence`, `showAchievement`, `hideOverlay`, `enterScene(world-town, town-square)`, `startDialogue`/`say(speaker: 'King')`, `addMeter` (gold halved), `stop` |

Key choreography notes:
- **Opening re-establishment block** is *not* part of the storyboard — it's
  the standalone-playback bridge that reconstructs exactly what Scene D1
  leaves on screen: `pc` 20/20 hp, `familiar` 14/14 hp, `bug-slime-1` 10/10
  (already revived), `bug-slime-2` 0/10 (dead, still on the field),
  `bug-slime-3` 5/10; `mp` 1/20; `gold` 20; the "47 TABS" `act-card` overlay
  and "Working As Intended" achievement toast both showing. It must be kept
  in sync with Scene D1's actual ending state if that scene's numbers change.
- Beat 10 immediately clears the inherited overlay/achievement
  (`hideOverlay`/`hideAchievement`), drains the last `mp` point (1 → 0) to
  hit "MP at 0" exactly, and uses `tagCombatant('needs-attention')` on
  `familiar` as the "posture shifts to face you" cue before the
  out-of-context `say` line.
- Beat 11's killing blow lands (pc 5 → 0, i.e. 20 − 15 − 5), then
  `defeatSequence` fires the *"Thou art dead."* card. The King scene reuses
  `world-town`'s `town-square` location (no throne-room map exists) and
  halves `gold` via a `-10` delta (20 → 10). The achievement toast (`"Who
  Art Thou?"`) is deliberately **left showing** at this scene's final `stop`
  — the next scene (Scene E) opens by clearing it, per scene-e.md.

## Needs additional definition (content, not engine work)

- **The opening re-establishment block is a standalone-preview
  approximation, not a literal storyboard beat.** In particular,
  `bug-slime-2` entering this scene's `startBattle` already at `hp: 0`
  (dead-on-arrival) is a visual artifact of reconstructing mid-battle state
  rather than replaying the real fight — flagged as tentative; if the
  engine ever supports true cross-scene state carryover, this whole block
  should be deleted in favor of it.
- **Cross-file coupling with Scene D1:** the re-establishment values above
  must track Scene D1's actual ending state exactly — if Scene D1's numbers
  or overlay/achievement text change, this block needs updating too. Same
  category of risk as Scene B/C's duplicated `showSaveFile` summary text.
- **No throne-room backdrop/location exists**, so Beat 11's King scene
  reuses `world-town`'s `town-square` named location purely for the dialogue
  to run somewhere — there's no distinct visual framing (no King NPC entity,
  no throne-room tileset). Flagged in case a later pass wants a real
  throne-room map/backdrop.
- **Achievement toast left showing past this scene's end** is a deliberate
  cross-scene dependency: Scene E's script must open by clearing it
  (`hideAchievement`, and probably `hideOverlay` for the King dialogue too).
- **Pause durations throughout (0.3–2s) are unrhymed placeholders**, not yet
  timed against the actual spoken narration for Beats 10–11.
- **Enemy/damage/HP numbers are placeholders**, inherited from Scene D1's
  same caveat — not tuned to any real pacing or difficulty curve.

## Needs additional engine work

None beyond what Scene D1 already flags (no scene-transition/darken action;
no compositing for many small UI elements) — neither applies directly to
Beats 10–11.

## Wiring it in

Not yet registered — a follow-up centralized step adds this scene to
`SCRIPTS` (`client-talks/src/talk-rpg/scripts/index.ts`). Intended entry:

```ts
{ id: 'scene-d2', name: 'Scene D2 — Stage 1: Vibe Coding (Death)', actions: sceneD2 as Action[], initialSceneId: OVERWORLD_MAP.sceneId }
```

(`initialSceneId` just needs to be any valid map id since the script's first
action, `startBattle`, immediately switches the scene to the shared
`'battle'` arena — `'world-overworld'` is used for consistency with Scene
D1, not because anything here depends on that map.)
