# ADM Talk — Storyboard (v1, resolved beats)

Human-readable precursor to the declarative step script the Director runs. Each **beat** ≈ one engine step with a full resting state. Beats between pauses auto-play; a `pause: yes` beat is where you click to advance (the "slide advance").

**Supersedes the overview doc on three points** it hasn't caught up on: the climax is the **Dragonlord + AI minions** (not a trench-coat slime); the wrong-spell beat is **Fire *heals* the enemy** (not "fire-immune"); review is a **spec/standing-order function**, not necessarily a named "review companion."

### How to read a beat
`Rest` = what's frozen on screen at rest · `Into` = the animation that plays to reach it · `Screen` = diegetic fantasy text on screen · `Say` = your spoken line (draft — carries the *engineering* meaning; the screen never says it) · `Ach` = achievement toast · `pause` = click-to-advance point.

### The one rule that governs every beat
**The screen shows only a fantasy world; your voice carries all the engineering meaning. The gap between the two is the whole effect — never close it.** You never acknowledge the game.

### Structural calls made here (all veto-able)
1. **Fire-heal is the single Stage-2 defeat.** It's locked, has the achievement, and must happen once so Stage 3 can *prevent* it. Cardboard-sword is demoted to optional texture (Beat 15) — likely cut for time.
2. **Cost-of-change gets its own beat (23).** It was a locked talk point with no game home; the un-migrated app is that home.
3. **The two principles get one concrete S3 beat each:** complexity → roles/boundaries (17); feedback loops → self-correcting auto-battle (19).
4. **Who-I-am folds into the save-file status screen (3)** — backstory compression + identity in one held screen.
5. **Intro flavor defaults to New Game+** ("AI-Enhanced Edition"); forced-patch alt noted at Beat 4. `[FORK]`
6. **Review kept as a spec/standing-order (18), not personified.** Personifying is still open. `[FORK]`
7. **Horthy placement** (SDD bookend) left as `[FORK]` at Beat 12 vs. Beat 24.

### Timing map (10 min)
Cold open 1:15 (B1–2) · Fear+identity 1:00 (B3) · Thesis 1:00 (B4–5) · Stage 1 2:00 (B6–11) · Stage 2 2:00 (B12–16) · Stage 3 2:00 (B17–20) · Climax+cost+close 1:00 (B21–25). Game budget is zero extra runtime — beats replace slides.

---

## SCENE A — Cold open  (title + the "SWE is dead" cycle)

**Beat 1 — Boot** · `pause: yes`
- **Rest:** Retro title screen (renamed DW-pastiche logo), menu: *Continue / New Game*, cursor blinking on *Continue*.
- **Into:** Logo fades in; chiptune sting; cursor blink begins.
- **Screen:** title + menu only.
- **Say:** Open on the recurring prophecy of our doom — "coding is dead" on an almost annual schedule, 2022 through 2026, each year "this time for real."
- **Notes:** Serious, not a bit. No game acknowledgment.

**Beat 2 — The headline cycle** · `pause: yes`
- **Rest:** Last of three fantasy newspaper cards held on screen.
- **Into:** Three headline cards flip in sequence: *"Next Year, Warriors Fall"* → *"This Time For Certain"* → *"A Squire Slew a Dragon in Three Hours."*
- **Screen:** the three headlines.
- **Say:** Land the cycle, then the honest turn — a world-renowned expert once told everyone to stop training radiologists because deep learning would replace them within five years. My brother is a radiologist. He's busier than ever. And still — I took "software engineering is dead" seriously. For a while, I believed it.

---

## SCENE B — The personal fear + who I am

**Beat 3 — The save file** · `pause: yes` · `Ach: "Grandmaster Engineer — twenty years, one craft, ten thousand bugs slain."`
- **Rest:** Character status/save screen: a **max-level hero**, a legend-log rendered as fantasy deeds (first blade as a boy → tongues of assembly and C++ → the painting of moving pictures → the web-weaving → the ML arts). Achievement toast settling.
- **Into:** Menu opens to the status screen; the deed-log scrolls once; achievement pops.
- **Screen:** stats (Lv 99), the deed-log.
- **Say:** Who I am, briefly: I've been writing code since I was a kid on a Commodore 64 — assembly, graphics, the web, now ML. I love this craft. Which is exactly why the fear hit so hard — I started to believe the part of me that mattered was eroding, that I might not be a useful contributor anymore.
- **Notes:** Earnest, unresolved. This screen does identity + backstory in one shot.

---

## SCENE C — The thesis, as a journey

**Beat 4 — The enhanced edition** · `pause: yes`
- **Rest:** Over the save file, a prompt: *"✦ AI-ENHANCED EDITION AVAILABLE ✦ — Begin?"*, cursor on *Yes*.
- **Into:** Prompt slides up; cursor moves to *Yes* on its own.
- **Screen:** the prompt.
- **Say:** I didn't set out to prove AI was hype, or to prove it was the future. I set out to find out whether I still added value — whether this discipline had a future. What made me re-examine my own skepticism was hearing people I respect take it seriously — a thirty-year veteran, a million-plus lines of production code, co-authoring a whole book on it. Not someone impressed by toy demos.
- **Notes:** `[FORK]` flavor — New Game+ (voluntary, shown) vs. an unrequested patch dropped on a game you'd finished (more destabilizing). Default = shown.

**Beat 5 — The prophecy** · `pause: yes`
- **Rest:** New world loaded; a prophecy scroll unfurled center-screen.
- **Into:** World fades in; scroll unrolls.
- **Screen:** *"The Hero's role is obsolete. The Dragonlord's AI minions shall replace all adventurers."*
- **Say:** Here's what I went in believing mattered, and what I came out knowing mattered: two things. Optimize for feedback loops. Manage complexity. I tested this on myself — here's what happened.
- **Notes:** The prophecy is the loaded gun the climax fires. Two principles planted here, paid off in Stage 3.

---

## SCENE D — Stage 1: Vibe coding

**Beat 6 — Into the dungeon** · `pause: no`
- **Rest:** Overworld; lone hero + one **generic familiar** at a dungeon mouth.
- **Into:** Hero + familiar walk on-rails to the entrance; screen darkens to dungeon.
- **Screen:** —
- **Say:** Stage one. Just me and one helper, and one instruction: go build stuff.

**Beat 7 — Spamming commands** · `pause: no`
- **Rest:** FF battle: hero + familiar (right), bug-slimes (left). Command menu open. **MP draining, Gold climbing.**
- **Into:** You fire command after command; familiar acts fast; damage numbers fly; MP bar drops, Gold ticks up.
- **Screen:** command menu; damage numbers.
- **Say:** It does a *lot*, fast. Underspecified prompts, and it just… goes.

**Beat 8 — Whack-a-mole** · `pause: no` · `Ach: "Necromancer — thy familiar hath revived the very bug thou just slew."`
- **Rest:** A slain bug-slime back on its feet, familiar mid-cast.
- **Into:** Familiar kills one slime, turns, casts **Revive** on a dead one; it stands back up.
- **Screen:** *"Familiar cast Revive on Bug-Slime!"*
- **Say:** Two steps forward, one step back — fixing one thing while quietly bringing back another.

**Beat 9 — The 47 tabs** · `pause: yes` · `Ach: "Working As Intended — thou hast built 47 tabs, and not one that thou asked for."`
- **Rest:** A menu overgrown with dozens of tabs/screens nobody asked for.
- **Into:** Tabs cascade open, filling the frame.
- **Screen:** an absurd tab sprawl.
- **Say:** And I *did* write a careful plan first. It built forty-seven things I never asked for and missed the one I did. I spent more time reverse-engineering what it made than I'd have spent building it.

**Beat 10 — It forgets the battle** · `pause: no`
- **Rest:** Battle, HP critical, enemy winding up; familiar turned to face *you* with a shopkeeper-style bubble; **MP at 0**.
- **Into:** MP bar empties; familiar's posture shifts; the out-of-context line appears as the enemy rears back.
- **Screen:** *"You're running low — shall we head back to town and stock up on potions?"*
- **Say:** It ran out of room to think — and forgot we were in a fight. Not random. Perfectly reasonable advice… for a situation we were not in.

**Beat 11 — Death** · `pause: yes` · `Ach: "Who Art Thou? — thy familiar forgot the battle mid-swing."`
- **Rest:** *"Thou art dead."* card; then throne room, half the Gold gone.
- **Into:** Screen flashes to the death card; cut to King; Gold counter halves.
- **Screen:** *"Thou art dead."* → *"I shall revive thee… but it shall cost thee."*
- **Say:** So I died on the first floor, out of gold and out of patience. I abandoned vibe coding.

---

## SCENE E — Respawn: the veteran's advice

**Beat 12 — The battle-hardened veteran** · `pause: yes`
- **Rest:** Town square; a scarred veteran NPC (renamed Yegge) mid-boast, a ghostly banner of many familiars behind him.
- **Into:** You approach; NPC bubble animates in.
- **Screen:** *"I once marched with a dozen familiars at once! …Merge-queues like a river of fire. Now I keep but three — and I write their orders down."* `[VERIFY exact claims]`
- **Say:** In town, the veterans point you at a better way. The one who ran a dozen agents at once — before it collapsed under its own weight — tells you the trick isn't more agents. It's writing the plan down, and following it. Read the plan, not the code.
- **Notes:** `[FORK]` — this is the SDD bookend open. Name Horthy here *or* hold him for Beat 24's reveal. Default: unattributed "the veterans" here, named at close.

---

## SCENE F — Stage 2: Spec-driven development

**Beat 13 — Write the spec** · `pause: no`
- **Rest:** A training-hall screen; a **battle-spec scroll** being inscribed; 2 more familiars recruited to the party.
- **Into:** Quill writes the spec; two familiars join the right side.
- **Screen:** a spec scroll: *Plan of Battle.*
- **Say:** Spec-driven development. Write the plan, align on it, *then* fight. And it worked — immediately better.

**Beat 14 — The cognitive-load peak** · `pause: yes`
- **Rest:** FF battle, 2–3 familiars clearly *winning*, but your command cursor is yanking frantically between them; one flashes low-HP off-plan.
- **Into:** Rapid cursor jumps between familiars; a low-HP warning you have to divert to; the pace is deliberately frantic.
- **Screen:** overlapping command prompts.
- **Say:** They were far more effective. But every one of them needed me — right now — and I was the one holding it all together. Real progress. And I was the bottleneck.
- **Notes:** Emotional peak. Do **not** smooth the franticness — it *is* the point.

**Beat 15 — I stopped watching** · `pause: no`
- **Rest:** You, nose in the spec-scroll, back turned to the familiars actually swinging.
- **Into:** Camera pushes on you reading the scroll while the fight blurs behind you.
- **Screen:** —
- **Say:** So I read the plan. And I stopped reading the code.
- **Notes:** `[OPTIONAL/PROVISIONAL]` cardboard-sword image could live here (un-inspected *equipment*) as a second texture beat — likely cut for time.

**Beat 16 — Fire heals the enemy** · `pause: yes` · `Ach: "You healed an enemy who was near death — and were then slain by that enemy."`
- **Rest:** The recurring **Hellspawn** back at full health, glowing; your party wiped.
- **Into:** A familiar casts **Fireball** on the near-dead Hellspawn; its HP bar *fills*; it retaliates; party falls.
- **Screen:** *"Your mage cast Fireball at the Hellspawn — it healed to full health!"*
- **Say:** The plan looked clean. Underneath, it was doing something confidently, catastrophically wrong — and because I never watched it work, it shipped. That's the debt you can't see accruing.

---

## SCENE G — Stage 3: The harness

**Beat 17 — The training ground (complexity)** · `pause: no`
- **Rest:** Familiar training ground; **four familiars with distinct roles**, each with an authored battle-spec card; clean boundaries between them.
- **Into:** You assign each familiar a role card; formation snaps into order.
- **Screen:** role cards (defined, bounded).
- **Say:** Stage three isn't better agents. It's a system — roles, boundaries, each one doing one job well. That's managing complexity, made structural.

**Beat 18 — The standing order (review)** · `pause: no`
- **Rest:** A pinned standing-order card visible above the party.
- **Into:** The order card flips up and locks.
- **Screen:** *"HOLD FIRE vs. Hellspawn — it feeds on flame."*
- **Say:** And the rules that catch the mistake *before* it happens — the review that reads the code so I don't have to catch it in production.
- **Notes:** `[FORK]` — personify this as a companion who stays another's hand, or keep it as the impersonal spec. Default: spec.

**Beat 19 — Self-correcting battle (feedback)** · `pause: no` · `Ach: "Averted — thy familiars held their flame ere they healed the beast to full."`
- **Rest:** Same Hellspawn (+ minions); a familiar's Fire cast visibly *aborted* and redirected; party healthy.
- **Into:** Familiar begins Fire → the standing order intercepts → it swaps to the right move → clean hits; the loop visibly self-checks.
- **Screen:** *"Fire withheld. Order followed."*
- **Say:** Fast feedback and managed complexity, now infrastructure — the system tests itself and fixes itself, before I'd ever see it.

**Beat 20 — Boring is the win** · `pause: yes`
- **Rest:** The battle rolling on with you issuing almost nothing; familiars executing calmly.
- **Into:** Your command cursor goes still; the fight proceeds without you.
- **Screen:** —
- **Say:** And when it's really working? It's boring to watch. That's the tell. I've gone from mashing buttons to just… commanding.

---

## SCENE H — Climax: the Dragonlord

**Beat 21 — The prophecy's monster** · `pause: no`
- **Rest:** Big FF battle: your four familiars (right) vs. the **Dragonlord + AI minions** (left).
- **Into:** The floor darkens; the Dragonlord descends with the recurring Hellspawn now a minion at his side.
- **Screen:** *"The Dragonlord and his minions appear!"*
- **Say:** And here's the thing the prophecy promised would end us.

**Beat 22 — Won by command** · `pause: yes` · `Ach: "The Prophecy Was Wrong — a squire, at the head of familiars, hath felled the Dragonlord."`
- **Rest:** Dragonlord defeated; hero front and center, having called the deciding order.
- **Into:** The party executes a coordinated finish on your single command; victory fanfare.
- **Screen:** *"Victory!"*
- **Say:** A low-level squire took him down. Not by out-fighting a dragon — by out-*commanding* one. That's a skill, and most people don't have it yet.

---

## SCENE I — The turn: cost of change

**Beat 23 — The thing you can't afford to rebuild** · `pause: yes`
- **Rest:** A view of the old Stage-2 stronghold still standing, cracks and all — un-migrated, inhabited.
- **Into:** Camera pans back to the earlier dungeon; a "still here" marker.
- **Screen:** *"Still standing. Too costly to raze."*
- **Say:** That broken thing I built in stage two? I never fixed it. Rebuilding it now costs more than living with it. The cost of *changing* code always beats the cost of writing it — and the faster we produce code, the more that matters, not less.

---

## SCENE J — Close: back to the fear

**Beat 24 — The town needs warriors** · `pause: no`
- **Rest:** Town square; villagers crowding with pleas.
- **Into:** NPC bubbles pop in sequence.
- **Screen:** *"We need warriors to lead the familiars!"* · *"Save my son — he went in with only a familiar, and is lost."*
- **Say:** The dread I opened with was real. It was also aimed at the wrong thing. The world doesn't need fewer of us — it's flooded with things built fast and left broken, and it's *begging* for people who know how to lead. `[FORK: name Horthy's reversal here — "I wasn't the only one who learned to read the code."]`
- **Notes:** The lost son = stage-1 you. Keep the rhyme.

**Beat 25 — To be continued** · `pause: yes (end)`
- **Rest:** Hero at the head of the four-familiar party; title reprise; *TO BE CONTINUED.*
- **Into:** Party assembles behind the hero; title fades up; hold.
- **Screen:** *Software Engineering Skills Are More Important Than Ever* → *TO BE CONTINUED.*
- **Say:** Typing was never the valuable part. Judgment, design, architecture, knowing what "good" looks like — those don't get cheaper when the code gets faster. They get more important. That's the part that was always mine. And it still is.

---

## Asset checklist (PixelLab)
**Sprites:** hero (overworld + battle, command pose); generic familiar (Stage 1); 4 role familiars (Stage 3); bug-slime; Hellspawn (recurring; fire-heal glow state); Dragonlord + 1–2 minions; veteran NPC (Yegge-pastiche); townsfolk ×3; King.
**Tilesets:** overworld, town, dungeon interior. **Battle backdrops:** dungeon, throne room, final arena.
**UI:** FF command menu; status/save screen; battle-spec scroll; role cards; standing-order card; prophecy scroll; 3 headline cards; achievement toast; MP + Gold meters; "Thou art dead" card; "AI-Enhanced Edition" prompt; title + "To Be Continued" cards.

## Open items surfaced while storyboarding
- `[FORK]` Beat 4 flavor · Beat 12/24 Horthy placement · Beat 18 personify review or not.
- `[VERIFY]` Beat 12 veteran's exact claims (Yegge specifics) · Horthy reversal wording · any Cherny line if used.
- `[DECIDE]` Beat 15 keep cardboard-sword texture or cut · confirm recurring enemy is the Hellspawn.
- **Cleanup owed:** the overview summary doc still reflects cut ideas — reconcile it to this storyboard.
