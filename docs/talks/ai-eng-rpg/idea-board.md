# ADM Talk — Idea Board (Parking Lot)

**What this is.** A capture of every live idea from the brainstorm and its open forks. This is *not* a storyboard and *not* a decision doc — nothing here is being forced to converge. It exists so that as we keep generating, nothing gets lost and new ideas have somewhere to land instead of something to collide with. Companion to `adm-talk-presentation-framework-mvp.md` (the engine) and the outline/talking-points docs (the content).

**Delivery context.** Virtual, over **Zoom** — no in-person room, no clicker. Presenter drives from a laptop with full **mouse + keyboard**, sharing one game **window/tab**. Nearly all viewers watch the **Zoom-compressed stream** on high-res laptops (a few on a conference-room TV, same stream). This retired the earlier big-room/projection and clicker assumptions and reshaped the production notes in §11.

**Status legend.**
- **[LOCKED]** — decided and stable; would take a real reason to reopen.
- **[LEANING]** — trending toward locked, not final.
- **[FORK]** — a genuine unresolved choice; captured, deliberately not resolved.
- **[PARKED]** — alive but set aside, optional, or a possible cut.
- **[VERIFY]** — a factual/naming check owed before it can go on a screen.

---

## 1. Foundation & format

| Idea | Status | Notes |
|---|---|---|
| Dragon Warrior **world/aesthetic** as the base (overworld, towns, slimes, prophecy, "Thou art dead," archaic voice) | [LOCKED] | Slime is the most instantly-legible retro-RPG visual for an eng crowd. |
| **Final Fantasy-style battle system** — side view, player party (hero + familiars) on the **right**, one or more enemies on the **left** | [LOCKED] | Swapped in fully. Frees the display to show multi-vs-multi encounters, which the escalating party and boss-with-minions both need. DW world + FF battles. |
| On-rails scripted playback, not a playable game | [LOCKED] | Runs like an animated slide deck; live gameplay is a trap. Supersedes the earlier "sliver of playable final battle" idea. |
| Phaser as the engine | [LOCKED] | Used for scripted cutscenes/tilemaps/sprites, not free player control. |
| Game budget = zero extra runtime | [LOCKED] | The game *replaces* slides; it never adds minutes. Timing table is already tight. |
| **Climax = the Dragonlord and his AI minions — a genuine boss fight** | [LOCKED] | *Replaces the cut trench-coat slime.* Stage-1-you would have been annihilated; well-run familiar party wins. Pays off the prophecy directly: "adventurers are obsolete" disproven by winning *as the commander*. |
| ~~Final boss = trench-coat "Coding Is Dead" slime~~ | **[CUT]** | Too obscure / meme-dependent / dies in Zoom compression. Removed. |
| Prophecy scroll at the open plants the dread | [LOCKED] | In-world "the Hero's role is obsolete — the Dragonlord's AI minions will replace all adventurers." The loaded gun the climax fires. |

## 2. The aesthetic thesis & guardrails

The spine principle that resolves most micro-questions: **the screen is a fantasy world with zero software vocabulary; the engineering meaning lives entirely in the spoken words.**

| Guardrail | Status | Notes |
|---|---|---|
| "Warrior, not software engineer" — no code, laptops, or dashboards on screen | [LOCKED] | The gap between what's said and what's shown is the engine of the whole thing. |
| Presenter never acknowledges the game / never says "this is like Dragon Warrior" | [LOCKED] | The less it's acknowledged, the harder it works. |
| Speaker stays earnest; the game makes the jokes | [LOCKED] | Keeps sincere-fear tone intact while still being funny (see §8). |
| Sincere dread must survive the max-level swagger | [LOCKED] | The fear lands *because* the accomplished hero gets wrecked anyway. Don't over-play competence. |
| Hero **commands**, never goes passive | [LOCKED] | The "Pokémon risk" — a trainer who just watches has abdicated, which argues the doomer case. Keep the hero visibly directing. |
| Tangent killer: if it can't be shown as a monster or gear, it's not on screen | [LOCKED] | Auto-blocks the React Native / testing / worktree weeds the outline keeps flagging. |

## 3. Framing shell & intro

| Idea | Status | Notes |
|---|---|---|
| New Game+ framing — carry accumulated power into a harder world | [LEANING] | The one mechanic whose premise *is* the thesis. Hero enters the AI world already max-level. |
| **Flavor fork:** voluntary "New Game+" **vs.** unrequested "patch/DLC dropped on a game you'd 100%ed" | [FORK] | Patch flavor is more destabilizing and maybe truer to how AI actually arrived mid-career. Whichever you pick quietly sets the *emotional temperature* of the fear section. |
| Start screen → "select Dragon Warrior" → save file shows conquered/high-level character → "AI-enhanced edition available" → select → game starts | [LOCKED] | The cold-open sequence. All on rails. |
| Backstory delivered as "your completed first playthrough," not a montage | [LEANING] | Commodore-64 → assembly → C++ → graphics → web → ML becomes carry-over history, not screen time. |
| Intro achievement as backstory compression | [LEANING] | e.g. "Grandmaster Engineer — twenty years, one craft" establishes the whole pre-AI career in ~2s vs. 15s of montage. |
| In-world headlines as the "SWE is dead" satire | [LOCKED] | The *one* text exception that gets to wink. "We Don't Need Dragon Warriors Anymore," etc. Real-world headlines stay in the presenter's mouth. |
| Headlines escalate on an annual schedule | [LEANING] | Mirrors the doc's 2022–2026 mockery: "Next Year, Warriors Fall" → "This Time For Certain" → "A Squire Slew a Dragon in Three Hours." |

## 4. The three-stage arc & defeat loop

**Structural spine (defeat → respawn → town → learn → return):** [LOCKED as structure]
A technique breaks down → shown as *defeat by an enemy* → respawn searches for a better approach → villagers/NPCs offer techniques → the hero "selects a class/approach" → returns to the map/cave with the new technique. Gives the three stages a game's shape instead of three themed slides.

| Element | Status | Notes |
|---|---|---|
| Death ladder: familiar's **context (MP)** empties → it *forgets the battle* and gives a coherent-but-irrelevant suggestion → you take hits → "Thou art dead" → King revives, takes half gold | [LOCKED] | Context is now MP (see §5). The half-gold revive-tax maps to "wasted tokens and time." |
| **Command mechanic evolves** (replaces the cut class-change screen): S1 = manual per-turn Attack/Spell commands (micromanaging); mid-game = **recruit new familiars** + visit the **"familiar training school"** to learn to write a **"battle spec"**; S3 = familiars act on their specs autonomously | [LOCKED] | The command menu itself carries the arc — hand-picking every action → writing specs → a self-running party. FFXII's *Gambit* system is the real precedent for "write a rule-based battle plan your party follows." |
| ~~Technique-selection = DW3-style class-change / job-select screen~~ | **[CUT]** | Replaced by the command-evolves / battle-spec mechanic above. |
| **Ending: return to town, villagers now *need* warriors** — "more warriors needed to lead familiars into battle"; "save my son, who went in with only a familiar and is now lost" | [LOCKED] | Refutes the cold open directly: the prophecy said warriors are obsolete; the town now begs for them. Demand-side evidence, not a gotcha. The general theme: rapidly vibe-coded apps will need engineers to fix them. |
| The "lost son" = **stage-1 you** (went in with a single familiar, got wrecked by a slime) | [LEANING] | Worth making the rhyme deliberate. Casts the engineer as rescuer, not relic. |
| "To be continued" **merges with the town ending** — the villagers' plea *is* the sequel hook | [LOCKED] | Final step's resting state: town square, "warriors needed to lead familiars," fade to *To Be Continued.* Playback stops there. |
| Overall closing thesis: coding gets commoditized; judgment/design/architecture don't | [LOCKED] | From the outline; the game resolves into it wordlessly. |

## 5. Context & resource metaphors

Both resources are now **native RPG stats** — no invented HUD element. Cost is literal; context is behavioral.

| Idea | Status | Notes |
|---|---|---|
| Token spend = **gold coins / cost** (real, literal number) | [LOCKED] | Cost is meant to read literally; a number is fine here. |
| **Context window = MP (magic points).** Each command drains it; at empty, the familiar **forgets the battle** | [LOCKED] | In-battle, not spatial. Replaces the cut torch/light idea. |
| Context loss = **coherent action on the wrong premise**, never random noise | [LOCKED] | The sharpest beat: the familiar hasn't gone haywire — it's competent about a situation you're not in. Truer *and* funnier, and it reads over compressed video because it's behavioral. |
| Signature amnesia line: mid-death, HP critical, familiar says **"You're running low — shall we head back to town and stock up on potions?"** | [LOCKED] | Confidently helpful about a reality that isn't happening. |
| ~~Context = torch / light radius~~ and ~~the "whole game is about light" motif~~ | **[CUT]** | Too hard to read on screen; the light-radius/fog framework capability (MVP group G) comes out of the build with it. Cave may survive only as a plain Stage-1 dungeon setting, if at all. |
| Both meters are native DW stats: **MP = context, Gold = cost** | [LOCKED] | No foreign HUD element anywhere. |
| Meters move only on meaningful beats, never constant animation | [LOCKED] | Constant motion becomes noise competing with the voice (and Zoom smears it). |
| Presenter never narrates the metaphor aloud | [LOCKED] | *Distinction:* diegetic **game text** on screen is fine and sometimes needed (see the fire-heal beat in §7); the *speaker* just never explains it. |
| Persistence depiction: the **written battle spec is the persisted plan** the familiar reads (survives the "forget") — optionally shown as a scroll/tablet | [LEANING] | This is the Erdrick's-Tablet idea folded into the battle-spec mechanic: knowledge lived on the page, not in its head. Rhymes with Yegge's *Beads* (agent memory on disk fixing "50 First Dates" amnesia) — see §10. |
| ~~Context-failure fork: clear vs. compaction~~ | **[RESOLVED → MP-forget]** | The MP-empties-and-forgets model *is* the amnesia/clear beat. Compaction [PARKED, likely cut] survives only as an optional throwaway if ever wanted. |

## 6. Party & class scaling

**Visible headcount growth is the legibility win** — the audience reads your progress from how many allies are on screen before you say a word.

| Stage | Party | Status | Notes |
|---|---|---|---|
| Stage 1 | One generic familiar, no class | [LOCKED] | Its genericness is the point — no role, just "do stuff," wildly commanded. |
| Stage 2 | A small party (2–3), frenetic non-coordinated commands between them | [LOCKED] | **Real progress** — the specs make familiars far more effective — that just *demands more of you* to micromanage. Not a failure stage; a success that doesn't scale because **you are the bottleneck.** Make sure the audience sees the familiars *winning* while you drown, or it reads as another failure. |
| Stage 3 | Four familiars with defined roles, acting on written battle specs, self-coordinating | [LOCKED] | The **familiar training ground**: player writes each familiar's battle plan (agentic roles/skills). The harness = the thing that removes you-as-the-switch. |
| **Familiar training ground** — where the player authors per-familiar battle specs before the fight | [LOCKED] | The Stage-3 signature location. See the command-evolves mechanic in §4; FFXII Gambits are the precedent. |
| A literal "review companion" familiar as a dedicated party member | [FORK] | You flagged it may be too on-the-nose a reference. The review *function* is locked (it catches the fire-heal mistake in §7); whether it's a named familiar or expressed more subtly is open. |
| Role mapping fighter/mage/thief/healer ≈ implement / generate / find-problems / review-and-heal | [LEANING] | The review/heal role is the uncertain one (see fork above). |
| **Fork:** how much the hero physically fights vs. purely directs in S3 | [LEANING → directs] | The FF command-menu model resolves this cleanly: the hero issues commands from the menu and the familiars execute — that *is* commanding. Keep him visibly issuing the deciding order rather than swinging. |
| Transition line into the party era | [FORK, wording open] | **Guardrail [LOCKED]:** it can *not* be "warriors don't need to fight anymore" (that's the doomer claim). It's closer to "the warriors who win now are the ones who can *command* — and most can't." The squire beats the dragon by being a better commander, not by outsourcing his relevance. Exact phrasing open. |

## 7. Stage-by-stage mechanic mapping (working draft)

| Stage | On-screen beat | Maps to | Status |
|---|---|---|---|
| S1 vibe coding | Wild per-turn commands to a lone familiar; it does a lot, often wrong | Underspecified prompts, flailing agent | [LOCKED] |
| S1 | **Whack-a-mole:** familiar kills a bug-slime, then **mistakenly Heals or Revives** a dead one | "Two steps forward, one back," reintroduced bugs | [LOCKED] |
| S1 | Wrong-thing-built: 47 tabs, none requested | Requirements doc, agent's own assumptions | [LEANING] |
| S1 | **Context (MP) empties → familiar forgets the battle → suggests going to town for potions** mid-fight → you take hits → death → respawn loop | Context loss as coherent-wrong-premise action | [LOCKED] |
| S2 SDD | Introduces a **recurring enemy** (reappears in S3 as a boss minion / lead-up to the Dragonlord) | Continuity that lets the S3 payoff land against a known foe | [LEANING] |
| S2 | You approve a tidy battle spec and the familiar *wins the room*, but **how it executes is deranged** — and you never watched | Read the plan, never read the code; invisible debt | [LEANING] |
| S2 | Cardboard-sword reveal mid-boss (weapon bends; you never checked its equipment) | The pandas-in-memory persistence surfacing during "migration" | [LEANING] |
| S2 | Frantic non-coordinated command-switching; a familiar needs healing off-plan; you scramble | **Your cognitive load** — the emotional peak of the talk | [LOCKED — don't smooth it out] |
| S2 | Review's *absence* is the wound (nobody watches the execution) | Review didn't happen | [LEANING] |
| S2/pre-harness | **Fire heals the enemy:** familiar casts Fireball on the recurring enemy and it **heals to full**; on-screen text *"Your mage cast Fireball at the Hellspawn, which healed it to full health!"* → you die to it | The cost of *no review* — a confident, wrong action that reverses progress | [LOCKED] |
| S3 harness | **Familiar training ground:** author each familiar's battle spec before the fight (roles/skills) | Systematizing the two principles | [LOCKED] |
| S3 | Standing orders like "healer heals when a familiar drops below ½" and "hold Fire vs. the Hellspawn — it heals from flame" | Feedback loops + complexity management as infrastructure | [LEANING] |
| S3 | The same recurring enemy is dispatched cleanly because the spec *prevents* the fire-heal mistake | Automated review catching drift before it ships | [LOCKED] |
| S3 | The fight becomes *boring to watch* — that's the win | Self-correcting harness | [LEANING] |
| Climax | **The Dragonlord + his AI minions** — a real boss fight the well-run familiar party wins | The prophecy disproven: you win *as the commander* | [LOCKED] |
| Close | **Return to town; villagers now need warriors** to lead familiars; "save my lost son" → *To Be Continued* | Vibe-coded apps will need engineers; typing was never the valuable part | [LOCKED] |

*Two enduring principles the whole arc rediscovers (from the outline):* optimize for feedback loops; manage complexity. [LOCKED as the throughline]

## 8. Achievements

**Device:** cheeky pop-ups (Dungeon Crawler Carl flavor) that split comedy into its own channel so the speaker stays earnest. [LOCKED]

| Rule / choice | Status | Notes |
|---|---|---|
| Deliver DCC snark in DW's archaic "Thou Hast…" voice | [LOCKED] | RetroAchievements actually wrote DW achievements this way ("Thou Hast Conjured the Magic Bridge"), so the fusion has real precedent and reads as intentional. |
| One per stage, landing on the failure or the turn — never peppered | [LOCKED] | Four or five total across the talk. Frequency kills the joke and competes with the voice. |
| Aimed only at the situation or your past vibe-coding self — never at Yegge, Horthy, or the audience | [LOCKED] | Self-deprecation is on-brand; the talk rests on honest admission. |
| Original text, not lifted from Dinniman | [LOCKED] | The format is a genre convention; the specific lines are his. |
| Diegetic home: the AI-enhanced zone is the thing that pops achievements; the old world never did | [LEANING] | Free justification from the New Game+ framing. |
| Death achievement matches the chosen context/failure mechanic | [RESOLVED] | The S1 death is the amnesia beat; the pre-harness death is the fire-heal beat. Named below. |

**Draft lines (all [PARKED] as candidates, pick per beat):**
- Intro: *"Grandmaster Engineer — twenty years, one craft, ten thousand bugs slain."*
- S1 wrong-thing-built: *"Working As Intended — thou hast built 47 tabs, and not one that thou asked for."*
- S1 death (amnesia): *"Who Art Thou? — thy familiar forgot the battle mid-swing."*
- S1 whack-a-mole: *"Necromancer — thy familiar hath revived the very bug thou just slew."*
- S2 cardboard sword: *"Thou Hast Read the Plan, But Not the Code — thy blade was mighty in the spec."*
- Pre-harness fire-heal death (your line): *"You healed an enemy who was near death — and were then slain by that enemy."*
- S3 payoff (harness prevents it): *"Averted — thy familiars held their flame ere they healed the beast to full."*
- Climax: *"The Prophecy Was Wrong — a squire, at the head of familiars, hath felled the Dragonlord."*

## 9. DW mechanics inventory (verified) — signature vs. set-dressing

Pick **2–3 signature** mechanics and let the rest be set dressing that rewards the people who catch it but costs everyone else nothing.

| Mechanic | Role | Status |
|---|---|---|
| **MP as a spent resource** — familiar's context; empties → forgets the battle | **Signature** — context | [LOCKED] |
| ~~Torch 3×3 / Radiant 7×7 light radius~~ | ~~context window~~ | **[CUT]** — too hard to read on screen |
| **FF-style side-view command menu** (Attack / Magic / Item…), party right, enemies left; evolves into autonomous battle-specs | Keep as the recognizable RPG menu, restyled FF | [LOCKED] |
| **FFXII Gambit system** — write rule-based battle plans the party follows | Precedent for the "familiar training ground / battle spec" mechanic | [LOCKED as precedent] |
| ~~DW3 class-change shrine~~ | ~~technique-select precedent~~ | **[CUT]** — replaced by battle-specs |
| Recurring enemy across S2 → S3 (Hellspawn or similar; heals from fire) | Continuity for the review payoff | [LEANING] |
| "Thou art dead" → King revives, half gold | Defeat sequence + revive-tax | [LEANING] |
| Cardboard sword (un-inspected equipment) | Invisible debt (S2) | [LEANING] |
| Swamp/barrier tiles damage each step; Erdrick's Armour negates it | Alt invisible-debt visual (cardboard sword is the pick) | [PARKED] |
| Repel / Fairy Water suppress weak encounters | Set dressing — harness noise suppression | [PARKED] |
| Metal slimes / Rainbow Drop gating | Set dressing | [PARKED] |
| Encounter transition | FF-style transition now fits the FF battle system; the old "authentic vs. borrowed flash" fork is moot | [RESOLVED → FF-style] |

## 10. Real-people & factual guardrails

| Guardrail / choice | Status |
|---|---|
| Real practitioners as NPCs, **names altered from their real ones**, callout **not made explicit** (rewards those who catch it, costs nothing to those who don't) | [LOCKED] |
| Paraphrase actual public positions; **never fabricate quotes on screen** | [LOCKED] |
| **Steve Yegge NPC** (renamed): a **battle-hardened veteran boasting about his familiar-army** | [LOCKED] | 
| — Verified facts for that NPC | [VERIFIED] — ex-Amazon/Google/Grab/Sourcegraph, 30+ yrs; co-authored *Vibe Coding* with Gene Kim. Really did run **~a dozen concurrent agents** (~2 weeks, "insane merge queues") before dialing back to 1–3 — the honest arc of the boast. |
| — **Correction:** *beads* and *Gas Town* are **two different tools**, not one | [VERIFIED] — **Beads** = git-backed memory/issue-tracker fixing agent "amnesia" (his "50 First Dates" line: agents wake with no memory). **Gas Town** = separate multi-agent *orchestration* engine. Beads rhymes directly with our *forget-the-battle* and *write-it-down persistence* beats. |
| **SDD bookend fork:** name Horthy (renamed) at the *open* (the advice you followed) or hold him to the *close* (the "turns out I wasn't alone" reveal) | [FORK — carried from the outline] |
| Any real-world product terminology shown on screen gets confirmed against current naming first | [LOCKED as a rule] |
| Hold game-lore and factual claims to the Hinton / Gene-Kim standard | [LOCKED as a rule] |

## 11. Production & legibility — Zoom delivery (see MVP doc for the full engine spec)

The real display target is **the Zoom-compressed stream**, not the source resolution. The codec punishes motion and fine detail; the machine runs the game *and* Zoom's encoder at once.

| Note | Status |
|---|---|
| DOM text overlay on top of Phaser for readability | [LOCKED] |
| Legibility target is *"after Zoom's codec re-encodes it"* — bold shapes, high contrast, large text; validate against a real Zoom re-encode | [LOCKED] (replaces the old big-room framing) |
| Restrain motion — fast full-screen pans, particle-heavy transitions, and constantly-animating meters are what compression smears most | [LOCKED] |
| Encounter *flash* and other rapid transitions may mush over Zoom — test, and soften if needed | [FORK/VERIFY, test it] |
| Fixed internal resolution + integer scaling, sized to the shared window; chunkier art / larger UI than pixel-authenticity alone would suggest | [LOCKED] |
| Share one **window/tab**, not the full screen | [LOCKED] |
| Hold a smooth framerate with headroom while Zoom encodes the share (performance contention is real) | [LOCKED] |
| **Private presenter surface** (current/next beat, jump list, notes) in a separate off-share window — an upgrade the share-one-window model unlocks | [LEANING, new] |
| Mouse + keyboard controls (no clicker); convenient laptop keys + clickable on-screen bar | [LOCKED] (replaces clicker) |
| Audio de-prioritized — over Zoom it needs "share computer sound" and competes with the mic; skip for MVP, sparse/low if ever added | [LEANING] |
| Test over an actual Zoom call and watch the compressed stream (recording or a second viewer); try normal vs. "optimize for video" share modes | [LOCKED as a rule] |
| Familiar art: deliberately slightly-off palette so it reads as "not-quite-right tool" without a word | [PARKED, nice touch] |
| Everything preloads; no runtime network; deterministic/no unseeded RNG | [LOCKED] (in MVP doc) |

---

## Consolidated open forks (the decisions genuinely still on the table)

1. **Intro flavor:** New Game+ (voluntary) vs. unrequested patch/DLC (forced). Sets the fear section's temperature.
2. **Literal "review companion" familiar** vs. expressing the review function more subtly (you flagged it as maybe too on-the-nose).
3. **Party-era transition line:** exact wording (guardrail locked, phrasing open).
4. **SDD bookend:** Horthy (renamed) at the open or revealed at the close.
5. **Stage 2 review-gap staging:** the "deranged execution you never watched" — how literally to show it (Rube-Goldberg execution, cardboard sword, or both as "how" + "what").
6. **Recurring enemy:** confirm it's the right continuity device from S2 into the S3 payoff / Dragonlord lead-up.

*Recently resolved (moved off the fork list):* context metaphor → MP-forget (torch/light cut); combat style → FF side-view; class-change screen → battle-spec mechanic; final boss → Dragonlord (slime cut); encounter transition → FF-style; hero fights vs. directs → directs via FF command menu.

## Verification queue (owed before anything goes on a screen)

- **[RESOLVED]** ~~Is "beads" Yegge's term?~~ — verified: Beads = his agent-memory issue tracker; Gas Town = separate orchestration engine. Both facts now in §10.
- **[VERIFY]** Boris Cherny quote wording and attribution, if the "100% of my contributions" line is used at all.
- **[VERIFY]** Horthy interview specifics (source, date, the exact reversal) before paraphrasing on an NPC.
- **[CONFIRM]** Final title/theme wording (open item carried from the outline).
- *(Dropped: the `/clear`-command naming check — context is now MP-forget in-battle, no literal command shown on screen.)*

