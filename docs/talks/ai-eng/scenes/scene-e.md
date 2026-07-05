# Scene E — Respawn: the veteran's advice

Source: `../adm-talk-story-board-01.md`, Beat 12.
Script: `client-talks/src/talk-rpg/scripts/scene-e.json` (plain `Action[]`) — the actual script lives there, not in this folder; see `CLAUDE.md` in this folder for why.

## Currently working

The beat is fully expressible with actions already **Established** in
`../action-vocabulary.md` — nothing new needed in the engine:

| Beat | Actions used |
|---|---|
| 12 — The battle-hardened veteran | `walkTo` (to `town-square`), `startDialogue(speaker: 'Veteran')`, `say`, `pause`, `endDialogue`, `stop` |

- `town-square` is already a named location on `world-town` (`client-talks/public/rpg/maps/world-town.json`, `(4,2)`), and the map's baked `pc` entity starts at `(2,2)` — `walkTo` pathfinds there with no map changes needed.
- The veteran has no baked map entity and needs none: he only talks, so he's expressed purely through the dialogue slot (`startDialogue`/`say`/`endDialogue`), exactly like the `Guide` speaker in `test-script.ts`'s Phase 3 proving script. No new entity, sprite, or map edit required for this beat.
- Script is standalone-precomputable via `runPrecompute(actions, MAPS, 'world-town')` — set as this scene's `initialSceneId` since the beat is set in the town square.
- `pause: yes` in the storyboard → the script ends on `stop`, the only presenter-visible checkpoint.

## Needs additional definition (content, not engine work)

- **Speaker label — deliberately unattributed, not blocking.** The script uses `speaker: 'Veteran'`, per the storyboard's own default ("unattributed 'the veterans' here, named at close"). This is *not* a placeholder to fix — it's the storyboard's stated default — but it is downstream of the open `[FORK]` below, so it could change if the fork resolves the other way. See "Open forks" below.
- **Exact quoted claims — blocking before the talk is presented.** `../adm-talk-story-board-01.md` tags this line `[VERIFY exact claims]`. The script currently authors the storyboard's own placeholder verbatim: *"I once marched with a dozen familiars at once! …Merge-queues like a river of fire. Now I keep but three — and I write their orders down."* `idea-board.md` §10 has since partially resolved the underlying facts (Yegge really ran **~a dozen concurrent agents** for ~2 weeks before dialing back to 1–3, per `[VERIFIED]`), but the exact **wording** quoted on screen — "a dozen familiars," "merge-queues like a river of fire," "now I keep but three" — has not itself been checked against his actual public statements/writing. Per `idea-board.md` §10's guardrail ("paraphrase actual public positions; never fabricate quotes on screen"), this line must be verified or re-worded from a real source before presentation. See "Open forks" below.
- **Reading-pause timing.** `pause: 3` seconds after the single `say` line is a placeholder, not yet timed against how long the line takes to read aloud or the presenter's own narration cadence (the storyboard's `Say:` line, which is presenter narration only and does not appear on screen).
- **`initialSceneId` for the registry entry.** Not authored here (out of scope per this task's constraints) — the intended value is `'world-town'`, matching this scene's own `initialSceneId` used for standalone precompute.

## Needs additional engine work

None. Everything above is a content decision, not a missing capability.

## Open forks (Horthy placement + VERIFY item)

Both of these are explicitly still open per the storyboard and `idea-board.md`, and neither is resolved by this scene — flagging them here rather than silently picking a side:

- **`[FORK]` — SDD bookend: name Horthy here or at Beat 24.** The storyboard's own note on this beat: *"this is the SDD bookend open. Name Horthy here or hold him for Beat 24's reveal. Default: unattributed 'the veterans' here, named at close."* `idea-board.md` §10 confirms this is still `[FORK — carried from the outline]`. This scene follows the stated **default** (unattributed `'Veteran'` speaker here), but that default is explicitly veto-able — if the fork resolves toward naming Horthy at Beat 12 instead, this scene's `speaker` field (and possibly its narration content) would need to change, and Scene J (Beat 24, `../adm-talk-story-board-01.md` line ~215) would lose its reveal. Whoever resolves the fork should update both scenes together.
- **`[VERIFY]` — the veteran's exact quoted claims.** Flagged above under "Needs additional definition" and tracked in `idea-board.md`'s "Verification queue" section ("Beat 12 veteran's exact claims (Yegge specifics)"). The quote currently authored in `scene-e.json` is the storyboard's own placeholder text, not yet confirmed against a real source — must be verified or rewritten before this beat is presentation-ready, per `idea-board.md` §10's "never fabricate quotes on screen" guardrail.

## Wiring it in

Not yet registered. `client-talks/src/talk-rpg/scripts/scene-e.json` exists as a
standalone script but is not yet added to `SCRIPTS`
(`client-talks/src/talk-rpg/scripts/index.ts`) — that's a follow-up,
centralized step covering all scenes at once. The intended registry entry:

```ts
{ id: 'scene-e', name: 'Scene E — Respawn: the veteran\'s advice', actions: sceneE as Action[], initialSceneId: 'world-town' }
```

This doc tracks the script's known placeholders/open items (see "Needs
additional definition" and "Open forks" above) and must be kept aligned
whenever the live script changes.
