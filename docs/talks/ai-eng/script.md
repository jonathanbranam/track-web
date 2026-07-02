# engineering-with-ai Talk — Script & Beat Map

Maps the eight sections of `adm-talk-outline.md` to the RPG's 10 game beats. See `architecture.md` for how beats are executed.

---

## Narrative arc

```
  TITLE / NAME ENTRY
       │
       ▼
  CASTLE INTRO ──────────────────────────────── "SWE is dead" fear
       │
       ▼
  OVERWORLD REVEALED ────────────────────────── Thesis: two principles
       │
  ┌────┴────────────────────────────────────────────────────────┐
  │  ACT I          ACT II          ACT III                     │
  │  Vibe Coding    Spec-Driven     The Harness                  │
  │  ──────────     ───────────     ───────────                  │
  │  solo hero      equip cursed    party joins                  │
  │  charges in     item, pay later automate the fight           │
  │  THOU ART DEAD  can't unequip   win cleanly                  │
  └─────────────────────────────────────────────────────────────┘
       │
       ▼
  COST OF CHANGE signpost
       │
       ▼
  DRAGONLORD OFFER ──── refused ──── "The hero refused."
```

The solo hero of Dragon Warrior is *by design* friendless in Act I. Companions in Act III are a genuine narrative rupture — which mirrors the speaker's actual experience of discovering sub-agents.

---

## Beat map

| Beat | `phaserSegment` | Outline section | Caption | Notes |
|------|----------------|-----------------|---------|-------|
| 0 | `title-screen` | — | *(none)* | Title screen auto-animates: logo fades in, `▶ BEGIN QUEST` pulses. Auto-advances after ~3 s. Pure spectacle — speaker is not yet talking. |
| 1 | `name-entry` | — | *(none)* | Name-entry screen. "J", "O", "N" types in one character at a time, then `CONFIRM`. Auto-advances. Speaker begins talking as name is typed. |
| 2 | `throne-room-intro` | §1 Cold open | `"Thy quest: software engineering."` | King NPC appears; king speech-bubble says the caption. Speaker delivers "SWE is dead" headlines while the scene is frozen on the throne room. |
| 3 | `castle-npcs` | §2 Personal fear | `"A voice whispers: thou art obsolete."` | Hero walks through castle; NPCs have speech bubbles with abbreviated headline text. Ends frozen on the final NPC. Speaker delivers the personal-fear beat. |
| 4 | `overworld-reveal` | §3 Thesis | Act card: `▸ THE PRINCIPLES` | Hero exits castle gate; top-down overworld pans out. Caption appears as the map is revealed. Speaker states the two principles. |
| 5a | `battle-slime-start` | §4 Vibe coding | Act card: `▸ STAGE 1: VIBE CODING` | Battle screen opens vs. "FLAKY TEST". Speaker introduces the stage. |
| 5b | `battle-slime-loop` | §4 Vibe coding | `"A Flaky Test draws near!"` then after a loop: `"Jon attacks! The Slime is unaffected."` | Hero attacks repeatedly; HP bar drains (damage on the hero, not the slime). Repeats 3× then freezes. Speaker narrates the endless loop. |
| 5c | `battle-slime-death` | §4 Vibe coding | `"Thou art dead."` | Black screen flash, `THOU ART DEAD` in big letters. Speaker: "I eventually abandoned it." Auto-advances after 2 s. |
| 6a | `cursed-item-find` | §5 Spec-driven | Act card: `▸ STAGE 2: SPEC-DRIVEN` | Hero reloads at save point; glowing item on the ground labelled `CSV DATAFRAME`. Hero walks to it, equips it. Speaker introduces the stage. |
| 6b | `cursed-item-locked` | §5 Spec-driven | `"The cursed DataFrame cannot be removed!"` | Hero tries to unequip; error flash. Caption is the punchline. Freezes. Speaker delivers the lesson. |
| 7a | `party-joins` | §6 Harness | Act card: `▸ STAGE 3: THE HARNESS` | Two new characters walk onto screen — `TEST AGENT` and `REVIEW AGENT`. Speaker introduces the stage. |
| 7b | `party-battle-win` | §6 Harness | `"A companion joins the party!"` | Trio enters battle; enemies dissolve quickly. Caption fires at the join moment. Speaker narrates the systematized approach. |
| 8 | `signpost` | §7 Cost of change | `"The cost of change is not free."` | Hero stands at a crossroads signpost. Caption is the thesis line. Freezes. Speaker delivers the "cost of change" beat. |
| 9a | `dragonlord-appears` | §8 Close | *(none)* | Dark screen; Dragonlord silhouette appears. Auto-advances after 1 s of drama. |
| 9b | `dragonlord-offer` | §8 Close | `"Let me do the typing. Thou need never think again."` | Dragonlord speech bubble. Freezes. Speaker: "The dread was real. This felt like an offer." |
| 9c | `dragonlord-refused` | §8 Close | `"..."` → `"The hero refused."` | First caption: pause beat. Second caption: the close. Auto-advances between them. Ends frozen on "The hero refused." Speaker delivers the final line live over it. |

---

## Caption text guidelines

- **Act cards** (`▸ STAGE N: TITLE`): uppercase, bold, centered, brief — set the stage for the next spoken section
- **Encounter labels** (`A Flaky Test draws near!`): Dragon Warrior dialogue-box style — first-person from the world
- **Punchlines** (`The cursed DataFrame cannot be removed.`): single sentence, maximum 60 characters, the speaker pauses *on* these while the audience reads
- **Dialogue** (Dragonlord offer): multi-line only for the close — the only moment where text pacing is the performance

**Rule:** if a caption says what the speaker is about to say, cut it. Captions reinforce and punctuate; they don't preview.

---

## Timing notes (against the 10-min outline)

| Beats | Outline section | Target spoken time |
|-------|----------------|-------------------|
| 0–1 | Title / name entry (auto) | 0:20 auto + speaker intro |
| 2–3 | §1–2 Cold open + fear | 2:00 |
| 4 | §3 Thesis | 1:00 |
| 5a–5c | §4 Vibe coding | 2:00 |
| 6a–6b | §5 Spec-driven | 2:00 |
| 7a–7b | §6 Harness | 2:00 |
| 8 | §7 Cost of change | 0:30 (folded into close) |
| 9a–9c | §8 Close | 1:00 |

Total target: ~11 min with auto beats. Trim §7 cost-of-change to a single line delivered over beat 8 and fold it into the close, per the outline's own compression suggestion.
