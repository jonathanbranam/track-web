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
| Retro RPG theme, Dragon Warrior as the base | [LOCKED] | Slime is the most instantly-legible retro-RPG visual for an eng crowd. |
| On-rails scripted playback, not a playable game | [LOCKED] | Runs like an animated slide deck; live gameplay is a trap. Supersedes the earlier "sliver of playable final battle" idea. |
| Phaser as the engine | [LOCKED] | Used for scripted cutscenes/tilemaps/sprites, not free player control. |
| DW as base that grows toward a FF/Ultima-style party | [LEANING] | Solo hero → multi-member party across the three stages (see §6). |
| Game budget = zero extra runtime | [LOCKED] | The game *replaces* slides; it never adds minutes. Timing table is already tight. |
| Final boss = "Coding Is Dead" as a palette-swapped slime in a trench coat | [LOCKED] | Concept locked; the *reveal* is guarded — must not leak before the final beat. |
| Prophecy scroll at the open plants the dread | [LOCKED] | In-world "the Hero's role is obsolete" framing. |

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
| Death ladder: context (MP) drains → tokens (HP) drain → "Thou art dead" → King revives, takes half gold | [LEANING] | The half-gold revive-tax maps cleanly to "wasted tokens and time." "Thou art dead" is DW's real text. |
| Technique-selection = DW3-style class-change / job-select screen | [LEANING] | Real JRPG precedent, so it reads as native, not a forced metaphor. |
| "To be continued" ending — hero powering up a bespoke harness, title card, meters recolored to a new steady state | [LOCKED] | Just the final step's resting state; playback stops on the card. |
| Overall closing thesis: coding gets commoditized; judgment/design/architecture don't | [LOCKED] | From the outline; the game resolves into it wordlessly. |

## 5. Context & resource metaphors

The hardest-won section. Division of labor: **cost gets a real-world label; context gets an environmental treatment with no label.**

| Idea | Status | Notes |
|---|---|---|
| Token spend = **gold coins / cost** (real, literal number) | [LOCKED] | Cost is meant to read literally; a number is fine here. |
| Context window = **torch / light radius** (visibility, no label) | [LOCKED] | Torch lights a small radius; as context fills, the light shrinks; on a wipe it goes out. No legend needed — everyone has felt "I can't see enough of the problem." |
| Style the meters as **MP** (DW's native drain mechanic) | [LEANING] | Reads as native to anyone who knows the game; reconciles "AI is an equipped tool" with "meters live on the familiar." |
| Hero equips a glitchy artifact that *summons* the familiar; the familiar burns its own resource | [LEANING] | Keeps the judgment/typing separation in the HUD itself — you equipped the tool, the tool spends. |
| "Whole game is about light" motif — S1 one flickering torch, S3 party holds steady light for each other | [LEANING] | Accretes without narration; S3 review companion literally keeps the light on the fire-immune enemy. |
| Meters/light move only on meaningful beats, never constant animation | [LOCKED] | Constant motion becomes noise competing with the voice. |
| Never explain any meter or the light aloud | [LOCKED] | One line at most, once, ever — and even that is the setup, not the explanation. |
| **Context-failure fork:** context **clear** (amnesia) vs. **compaction** (confusion) | [FORK, leaning clear] | *Clear* is load-bearing because it has a redemption arc — the same wipe kills in S1 and *saves* in S2 (plan was written to disk first). Compaction is a dead-end gag. **Leaning:** clear as the spine; compaction [PARKED] as an optional earlier throwaway with no death attached. Showing both in one S1 fight reads as "it glitched twice." |
| Clearing as a spine across all three stages | [LEANING] | S1 clear → amnesia → death; S2 write spec to disk → clear → familiar reads it back → survive; S3 clearing is a non-event (harness always persists, sub-agents run fresh-scoped by design). |
| Amnesia depiction: familiar switches to shopkeeper/innkeeper dialogue mid-battle | [LEANING] | Strongest line is the town-restock one — "Your health is low, let's head to town and stock up on potions" — while being hit and out of potions. Confidently helpful about a reality that isn't happening. |
| Persistence depiction: **Erdrick's Tablet** callback — inscribe the battle plan on the tablet, the wipe hits, the familiar *reads the tablet* and resumes | [LEANING] | Better second use of the Tablet than the backstory hook. Knowledge lived on stone, not in its head. |

## 6. Party & class scaling

**Visible headcount growth is the legibility win** — the audience reads your progress from how many allies are on screen before you say a word.

| Stage | Party | Status | Notes |
|---|---|---|---|
| Stage 1 | One generic familiar, no class | [LEANING] | Its genericness is the point — no role, just "do stuff," wildly commanded. |
| Stage 2 | A small party (2–3), acting as a **relay** — one fights at a time, then tags out | [LEANING] | True to what you actually did (one agent coding at a time; test → sync/archive spec → hand off). On screen: not four swinging at once (chaos), but staggered hand-offs. |
| Stage 3 | Four warriors, defined roles, self-coordinating | [LEANING] | Fighter/mage/thief/healer ≈ implement / generate / find-problems / review-and-heal. |
| Review companion = the healer/white-mage who inspects before the swing | [LEANING] | Payoff to an S1 seed (lone familiar casts Fire on a fire-immune enemy with nobody to stop it). |
| **Fork:** how much the hero physically fights vs. purely directs in S3 | [FORK] | Leaning: hero still throws the *deciding* blow but sets it up through the party. Full-passive risks the Pokémon problem; full-fighting undercuts "commanding is the real skill." |
| Transition line into the party era | [FORK, wording open] | **Guardrail [LOCKED]:** it can *not* be "warriors don't need to fight anymore" (that's the doomer claim). It must be closer to "the warriors who win now are the ones who can *command* — and most can't." The squire beats the dragon by being a better commander, not by outsourcing his relevance. Exact phrasing open. |

## 7. Stage-by-stage mechanic mapping (working draft)

| Stage | On-screen beat | Maps to | Status |
|---|---|---|---|
| S1 vibe coding | Wild commands to a lone familiar; it does a lot, often wrong | Underspecified prompts, flailing agent | [LEANING] |
| S1 | Torch keeps going out / light shrinks; familiar confused in the dark | Context filling / clearing | [LEANING] |
| S1 | Whack-a-mole: kills a bug-slime, a dead one respawns behind it | "Two steps forward, one back," reintroduced bugs | [PARKED/leaning] |
| S1 | Wrong-thing-built: 47 tabs, none requested | Requirements doc, agent's own assumptions | [LEANING] |
| S1 | Death (context→tokens→dead) triggers the respawn loop | Abandonment of vibe coding | [LEANING] |
| S2 SDD | Has the map/strategy guide but crosses the swamp unarmored, taking unseen chip damage each step | Read the plan, never read the code; invisible architectural debt | [LEANING] |
| S2 | Cardboard-sword reveal mid-boss | The pandas-in-memory persistence surfacing during "migration" | [LEANING] |
| S2 | Frantic tag-switching between relay agents; one needs healing off-plan; you scramble | **Your cognitive load** — the emotional peak of the talk | [LOCKED — don't smooth it out] |
| S2 | Review's *absence* is the wound (nobody checks the gear) | Review didn't happen | [LEANING] |
| S3 harness | Pre-battle "war room / training arena": set standing orders (tells) | Systematizing the two principles | [LEANING] |
| S3 | Orders like "healer heals when fighter <½" and "at 50% boss HP, cast Fire Protection before the fire attack" | Feedback loops + complexity management as infrastructure | [LEANING] |
| S3 | The fight becomes *boring to watch* — that's the win | Self-correcting harness | [LEANING] |
| S3 | Review companion walks on as a character; stays your hand from Fire-on-fire-immune | Automated review catching drift | [LEANING] |
| Close | Slime-in-trench-coat baits you into spamming spells; the win is a judgment call, not a resource dump | Typing was never the valuable part | [LEANING] |

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
| Death achievement must match the chosen context-failure mechanic | [OPEN] | If clear is the S1 death, the achievement is an amnesia gag, not "died during auto-compaction." Pick the death, then name it. |

**Draft lines (all [PARKED] as candidates, pick per beat):**
- Intro: *"Grandmaster Engineer — twenty years, one craft, ten thousand bugs slain."*
- S1 wrong-thing-built: *"Working As Intended — thou hast built 47 tabs, and not one that thou asked for."*
- S1 death (amnesia): *"Who Art Thou? — thy familiar forgot the battle mid-swing."*
- S1 death (compaction, only if used): *"'Twill Only Be a Moment — struck down whilst thy familiar tidied its thoughts."*
- S2 cardboard sword: *"Thou Hast Read the Plan, But Not the Code — thy blade was mighty in the spec."*
- S3 payoff: *"Averted — thy review companion stayed thy hand ere it cast Fire upon the flame-proof."*
- Close: *"The Dragonlord Was a Slime in a Trenchcoat — thou hast known this all along."*

## 9. DW mechanics inventory (verified) — signature vs. set-dressing

Pick **2–3 signature** mechanics and let the rest be set dressing that rewards the people who catch it but costs everyone else nothing.

| Mechanic (verified) | Role | Status |
|---|---|---|
| Torch = 3×3 light; Radiant = 7×7, decaying over steps (radius 3 for 80 steps → 2 for 60 → 1 for 60) | **Signature** — context window | [LOCKED as metaphor] |
| MP as a spent resource | **Signature** — meter styling | [LEANING] |
| Swamp/barrier tiles damage each step; Erdrick's Armour negates it | **Signature** — invisible debt (S2) | [LEANING] |
| "Thou art dead" → King revives, half gold | Defeat sequence + revive-tax | [LEANING] |
| Repel / Fairy Water suppress weak encounters | Set dressing — harness noise suppression (S3) | [PARKED, nice-to-have] |
| Command window (Fight / Spell / Run / Item), blue bordered boxes | Keep authentic — the recognizable RPG menu | [LOCKED] |
| DW3 class-change shrine | Precedent for the technique-select screen | [LEANING] |
| Metal slimes (most XP, flee a lot) | Set dressing | [PARKED] |
| Rainbow Drop / bridge gating | Set dressing | [PARKED] |
| Encounter transition | [DECISION] DW1's is understated (no FF swirl); a punchier flash is a legitimate "upgrade the resolution" liberty, just know it's borrowed | [FORK, minor] |

## 10. Real-people & factual guardrails

| Guardrail | Status |
|---|---|
| Real practitioners (Yegge, Horthy) as NPCs: **paraphrase actual public positions, never fabricate quotes on screen** | [LOCKED] |
| **SDD bookend fork:** name Horthy at the *open* (the advice you followed) or hold him to the *close* (the "turns out I wasn't alone" reveal) | [FORK — carried from the outline, do not resolve without your input] |
| Any real-world product terminology shown on screen (command names, etc.) gets confirmed against current naming before projecting | [LOCKED as a rule] |
| Hold game-lore and factual claims to the same standard as the doc's Hinton and Gene-Kim corrections | [LOCKED as a rule] |

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
2. **Context-failure mechanic:** clear-only (leaning) vs. clear + a parked compaction throwaway.
3. **Hero in Stage 3:** how much he physically fights vs. purely directs.
4. **Party-era transition line:** exact wording (guardrail locked, phrasing open).
5. **SDD bookend:** Horthy named at the open or revealed at the close.
6. **Encounter transition:** authentic-understated vs. borrowed punchier flash (minor).
7. **Whack-a-mole beat:** keep as its own S1 visual or fold entirely into the death sequence.

## Verification queue (owed before anything goes on a screen)

- **[VERIFY]** Is "beads" actually Steve Yegge's term, and does it mean what we think? (Same standard as the Hinton/Gene-Kim fixes.)
- **[VERIFY]** Current product naming for any command terminology shown literally on screen (e.g. a `/clear`-style command).
- **[VERIFY]** Boris Cherny quote wording and attribution, if the "100% of my contributions" line is used at all.
- **[VERIFY]** Horthy interview specifics (source, date, the exact reversal) before paraphrasing on an NPC.
- **[CONFIRM]** Final title/theme wording (open item carried from the outline).
