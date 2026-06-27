# Dungeon Tactics — Tabletop Playtest Kit (Playtest 01)

> **Goal.** Validate the **four-archetype asymmetry** by hand, on a tabletop, with a
> D&D battle map and figures — *before* any of it is coded. Each archetype should
> **feel like a different game to play**. This doc is a self-contained rulebook: every
> number is fixed, every action is auto-resolving, and the "what to track on paper"
> list for each unit is spelled out so one person can run the whole encounter solo.
>
> Scope is deliberately tight: **one** build of each archetype, a short action list
> each, simple enemies, two small maps. Resist adding more until you've played it once.

The four builds under test:

| Archetype | Build | One-line identity |
|---|---|---|
| **Fighter** | **Berserker** (kinetic) | Moves *through* attacks; shoves enemies into walls/each other for collision damage. |
| **Rogue** | **Skirmisher** (movement-based) | Huge mobility, passes through enemies; damage is *earned by moving*. |
| **Ranger** | **Kiter** | Shoot-and-scoot; must move between shots; rotates ammo; zones space. |
| **Mage** | **Artillery** (mana-points) | Blinks around, banks/spends Mana on spells, reshapes terrain; fragile. |

---

## 1. Materials

- A square battle grid (your D&D map). 1 square = 1 **tile**.
- 4 PC figures (label them Berserker / Rogue / Ranger / Mage) + ~6 enemy figures.
- **Tokens** (coins, dice, scraps): mark *poison*, *frozen*, *marked*, *caltrops*,
  *traps*, *wall* segments, and *hazards* on the map.
- One sheet of paper per side for HP and resource tracking (templates in §9).
- **No dice are required to resolve combat** — all damage is fixed and all attacks
  auto-hit. Keep one d6 only for breaking AI ties if you want (§6).

---

## 2. Core rules (shared by every unit)

These are the rules you apply the same way for all four PCs and the enemies.

### Grid, distance, and adjacency
- **Movement is cardinal only** (up / down / left / right). No diagonal steps, unless a
  unit's entry says otherwise. Each orthogonal step costs **1** of the unit's move.
- **Range ("within N")** is measured by **king-moves** (Chebyshev): diagonals *count*
  for range even though you can't *move* diagonally. "Within 3" = any tile in the 7×7
  block centred on you.
- **Adjacent** = the **8 surrounding tiles** (within 1 by king-move).
- A unit **cannot end** its move on an occupied tile. It is blocked from *passing
  through* enemies, walls, and objects (the Rogue is the exception — see its entry).
  It may pass through allies.

### Turn structure (sequence of play)
1. **Players' phase** — activate your 4 PCs **one at a time, in any order you choose**.
   Finish one unit's whole turn before starting the next.
2. **Enemies' phase** — activate every enemy once (§6 AI).
3. Repeat until one side is gone.

(For Playtest 01, players-first is fine and keeps solo bookkeeping simple. If it feels
lopsided, switch to alternating activations: one PC, then one enemy, etc.)

### Resolving an action
- Attacks **auto-hit** if the target is in range/arc and (for ranged) in line of sight.
  There is **no to-hit roll**. Damage is the **flat number** printed on the action.
- **Line of sight (LOS):** trace a straight line between the two tiles' centres. If it
  crosses a wall or a blocking object, LOS is blocked. Other units do **not** block LOS
  (keep it simple for v1). Melee/adjacent actions ignore LOS.
- A unit drops at **0 HP** and is removed immediately.

### Forced movement & collisions (the Berserker's bread and butter, but universal)
- **Push** = move the target directly **away** from the source, one cardinal tile at a
  time. **Pull** = directly **toward** the source.
- If a pushed/pulled unit would enter a tile blocked by a **wall, mountain, object, edge
  of map, or another unit**, it **stops** and takes **collision damage**: **2** for a
  wall / object / unit / edge, **3** for a **mountain** (the jagged rock). If it stopped
  against *another unit*, **that unit also takes 2**.
- If forced movement would carry a unit **onto a removal tile (pit or water)**, it does
  **not** stop at the edge — it is moved onto the tile and **removed** (fell / drowned),
  unless it can fly or swim (water only). This is the big payoff for Shove / Hook / a
  knockback into the right terrain.
- If forced movement ends a unit on any other hazard tile (fire), apply it immediately.

### Terrain & hazards (mark the tile; affects any unit on / entering it)
| Tile | Symbol | Movement | On contact |
|---|---|---|---|
| **Wall** | `#` | Blocks move + LOS | Collision: stop, **2 dmg**. (Mage-made walls behave the same.) |
| **Mountain** | `^` | **Blocks move + LOS** (impassable, tall) | Collision **into** it: stop, **3 dmg**. |
| **Forest** | `f` | Passable | **Flammable.** If a *fire* effect touches the tile, it **ignites** and becomes a **Fire** tile for the rest of the game. |
| **Water** | `w` | Passable but **lethal to the grounded** | A unit that **enters or ends its turn** in water **drowns — removed — unless it can fly or swim.** Walking units won't *voluntarily* enter; **forced** in = drown. |
| **Pit** | `O` | Impassable on foot | A unit **forced** in is **removed** (fell). |
| **Fire** | `~` | Passable | **Enter** the tile or **start your turn** on it: **2 dmg**. (An ignited forest becomes this.) |

- A **"fire effect"** = Mage **Firebolt / Fireball** or Ranger **Explosive** arrow.
  Frostbite is cold and does **not** ignite forest.
- *Terrain experiments to try across games:* let an ignited forest **spread** to adjacent
  forest at the start of each turn; give a forest tile **cover** (blocks LOS through it);
  add a **flying/swimming** enemy so water's exception actually comes into play (§7).

---

## 3. Berserker — the Kinetic Fighter

**Plays like:** a wrecking ball. You don't chase with footsteps — you *charge*, *spin*,
and *shove*, and you win by slamming enemies into walls, hazards, and each other.

**Stats**
| HP | Base Move | Special |
|---|---|---|
| **14** | **2** (cardinal) | Collisions: see §2. No special resource. |

**Turn:** up to **2 tiles of free move** **+ 1 Action**. Some actions carry their *own*
movement (Charge, Whirlwind) on top of resolving the attack.

**Actions (pick one per turn):**
| Action | Range / shape | Effect |
|---|---|---|
| **Cleave** *(attack)* | The **3 tiles on one facing** (e.g. the three tiles along your north edge) | **3 damage** to every enemy in those tiles. |
| **Charge** *(attack + move)* | Move up to **4** in a **straight cardinal line** to a tile adjacent to an enemy | **4 damage** to that enemy, then **push it 1**. **+1 damage** if you moved ≥3 tiles. Path must be clear. |
| **Shove** *(utility)* | One **adjacent** enemy | **Push it 2.** No direct damage — the *collision* is the damage (§2). |
| **Hook** *(utility)* | One enemy **within 3** in a straight cardinal line, clear path | **Pull it 2** toward you (or until adjacent). Great for dragging an enemy into a hazard. |
| **Whirlwind** *(attack + move)* | **All 8 adjacent** tiles | **2 damage** to every adjacent enemy, then **move 1**. |

**Track on paper:** just **HP**. (No resource. Everything else is figures + tokens on
the map.)

**Sample turn:** Charge 4 tiles into a brute standing in front of a pit → 5 damage
(moved ≥3) and push it 1 → it goes into the pit → **removed**. Then your free move is
already spent by the charge, so you're done.

---

## 4. Rogue — the Movement Skirmisher

**Plays like:** a darting blade. You're always moving, you flow *through* enemy lines,
and your big hit only lands if you've **earned it with movement** this turn.

**Stats**
| HP | Move (MP) | Special |
|---|---|---|
| **8** | **6 Movement Points (MP)/turn** | **Passes through enemies** (may move *through* enemy tiles; still can't *end* on one). |

**Turn:** spend your **6 MP** (1 per tile) and take **2 Actions**, in **any order**
(move-act-move-act is the intended rhythm). Unused MP is lost at end of turn.

**Actions (you get 2 per turn):**
| Action | Range | Effect |
|---|---|---|
| **Backstab** *(attack)* | Adjacent | **5 damage IF you have moved ≥3 tiles so far this turn**, otherwise **2**. |
| **Throw Dagger** *(attack)* | **4** (LOS) | **2 damage.** |
| **Quick Step** *(special)* | self | **Refill +3 MP** right now (keeps the chain going). |
| **Mark** *(utility)* | **4** (LOS) | Put a *marked* token on an enemy. The **next** hit it takes (from anyone) deals **+2**. One mark at a time. |
| **Caltrops** *(utility)* | within **2** | Drop a *caltrops* token on an empty tile. First enemy to enter takes **1** and **stops** (ends its move). |

**Track on paper:**
- **HP**
- **MP remaining** this turn (tick down as you move; Quick Step adds back)
- **Tiles moved this turn** (a running tally — this is the Backstab condition)
- **2 actions used?** (just two checkboxes)
- *marked* / *caltrops* tokens live on the map, not paper.

**Sample turn:** Move 4 through a gap between two brutes (passthrough) → MP 2 left,
moved-tally = 4 → **Backstab** for **5** (moved ≥3) → **Quick Step** (+3 MP, now 5) →
move 3 away to safety. Two actions used (Backstab, Quick Step), turn ends.

---

## 5. Ranger — the Kiter

**Plays like:** a metronome of shoot-step-shoot. You can't stand still, your weapon's
job rotates every shot, and you shape the floor the enemy is allowed to walk on.

**Stats**
| HP | Move | Special |
|---|---|---|
| **10** | **4** (cardinal) | **Ammo cycle** persists across turns (see below). |

**Turn:** you may take up to **2 shots**, but you **must spend ≥2 tiles of movement
between** your first and second shot (the "scoot"). Total move ≤ 4. You may also move
before the first shot and after the last, within that budget.

**Ammo cycle (the signature).** Every **Shoot** uses your **current** ammo, then advances
the pointer **Normal → Poison → Explosive → Normal …**. The pointer **carries over
between turns** — plan around where it sits.

| Ammo | Range | Effect |
|---|---|---|
| **Normal** | 6 (LOS) | **3 damage.** |
| **Poison** | 6 (LOS) | **2 damage** now + place *poison* token: target takes **1** at the start of its next turn. |
| **Explosive** | 6 (LOS) | **2 damage** to target **+ 1** to every tile adjacent to it. |

**Other actions** (each replaces one of your two "shots"; they do **not** advance the
ammo pointer):
| Action | Range | Effect |
|---|---|---|
| **Net** *(utility)* | 4 (LOS) | Place *frozen/rooted* token: target **can't move on its next turn** (it may still attack if already adjacent). |
| **Trap** *(utility)* | within 3 | Place a *trap* token on an empty tile. First enemy to enter takes **3** and **stops**. |

**Track on paper:**
- **HP**
- **Ammo pointer** (write `N / P / E` and circle the current one; advance after each shot)
- **Shots taken this turn** (max 2) and a check that you **moved ≥2 between them**
- *poison* / *frozen* / *trap* tokens live on the map.

**Sample turn:** pointer on **Explosive** → Shoot a clustered brute: 2 to it + 1 to its
two neighbours (pointer → Normal). Move 2 (the mandatory scoot). Shoot **Normal** at a
straggler for 3 (pointer → Poison). Move 2 back behind a wall.

---

## 6. Mage — the Mana Artillery

**Plays like:** a glass cannon that teleports and rewrites the board. You bank Mana for a
big turn or chip with small spells, then stand exposed.

**Stats**
| HP | Move | Mana |
|---|---|---|
| **8** | **Blink** (no walking) | **Start 6. +2 at the start of each of your turns. Cap 10.** |

**Turn:** **Blink once** (free) **+ cast spells until you run out of Mana.** You may cast
several small spells or one big one — that's the boom/bust choice. Blink may be used
before or after casting.

| Action | Cost | Range / shape | Effect |
|---|---|---|---|
| **Blink** *(move)* | free, 1×/turn | teleport to any empty tile **within 5** | Ignores units, objects, and hazards in between. Can't pass *through* a solid wall (count tiles around it... or just disallow landing past a wall for v1: must have LOS to the tile). |
| **Firebolt** *(attack)* | **2** | 6 (LOS), single | **3 damage.** |
| **Frostbite** *(attack)* | **3** | 6 (LOS), single | **2 damage** + *frozen*: target **skips its next move**. |
| **Fireball** *(attack)* | **5** | aim a tile within 6 (LOS); **3×3 area** (radius 1) | **3 damage** to every unit in the 3×3 — **friend or foe.** |
| **Conjure Wall** *(utility)* | **3** | up to **3** connected empty tiles within 4 | Create *wall* tokens (block move + LOS). **Max one wall (3 tiles) on the map at a time** — a new one removes the old. |

**Track on paper:**
- **HP**
- **Mana** (a running count: +2 at start of turn up to 10, subtract spell costs)
- *frozen* tokens on enemies; *wall* tokens on the map.

**Sample turn:** Mana 6 (+2 = 8). Blink 5 onto a ridge with LOS to three clustered
brutes. **Fireball** (−5) → 3 to all three. Mana 3 left → **Firebolt** a survivor (−2) →
3 more. End with **1 Mana**, fully exposed — next turn you'll want a wall or a blink out.

---

## 7. Enemies — the Brutes

Keep the opposition dead simple so the test is about *your* four units.

**Brute** — HP **6**, Move **4** (cardinal), Attack: **adjacent, 3 damage** (auto-hit).
**Archer** (optional, for one or two figures) — HP **4**, Move **3**, Shoot **range 5
(LOS), 2 damage**.
**Harpy** *(optional — adds the water exception)* — HP **4**, Move **5**, **flying** (may
move over and end on water without drowning; ignores pits), Attack: **adjacent, 2 damage**.
Drop one in to see whether water terrain still matters when the enemy can ignore it.

**Enemy AI (deterministic — run it the same every time):**
1. **Target** = the PC with the **fewest current HP** that it can *reach and act on*
   this turn; if none reachable, the **nearest** PC.
2. **Brute:** move toward the target by the shortest cardinal path; if it ends adjacent,
   attack. (It will path *around* hazards — brutes aren't suicidal — and around walls.)
3. **Archer:** if a PC is within 5 and in LOS, **shoot**, then step **1 tile away** from
   the nearest PC. Otherwise move toward the nearest PC.
4. **Ties** (equal HP or equal distance): pick the one the *Berserker is NOT* adjacent
   to if possible (enemies prefer softer targets); otherwise roll a d6 / pick freely.

> This dumb AI is intentional. Note where it makes the asymmetry **not** show up (e.g.
> it never spaces out against an Anchor, never avoids being shoved into a pit). Smarter
> reactive AI is a separate workstream — see the note in
> [`units/archetype-concepts.md`](../units/archetype-concepts.md#statuses-setup-for-the-kill).

---

## 8. Scenarios — two maps

Legend: `.` open · `#` wall · `^` mountain · `f` forest · `w` water · `O` pit · `~` fire ·
`1–4` your PCs (1 Berserker, 2 Rogue, 3 Ranger, 4 Mage) · `B` brute · `A` archer.
Party starts left, enemies right. **Victory:** clear all enemies. **Loss:** all 4 PCs down.

### Map A — "The Pool" (8×8)

```
   . . . ^ ^ . . B
   . . . ^ . f f .
   1 2 . . w w . B
   3 4 . . w w . .
   . . . . . . f A
   . . O . . f f B
   . . . . ^ . . .
   . . . ^ ^ . . B
```

- **Enemies:** 4 Brutes + 1 Archer (add a 5th Brute if too easy).
- **Terrain on test:** central **water pool** (cols 5–6) — the prime Shove/Hook/Fireball
  drown target; **forest** on the right (the enemies' side) for the Mage/Ranger to ignite;
  **mountain** clusters top & bottom that block lanes and bite on collision; one **pit**.

### Map B — "The Long Field" (8×10, wider than tall)

```
   . . . . ^ ^ . . . B
   1 2 . . ^ . f f . .
   3 4 . . . . f . . B
   . . . w w w . . . A
   . . . w w w . . . B
   . . O . . . . f f .
   . . . . ^ . . f . B
   . . . ^ ^ . . . . .
```

- **Enemies:** 5 Brutes + 1 Archer.
- **Why wider:** the extra horizontal room is the **kiting/flanking test** — the Ranger
  gets real shoot-and-scoot distance, the Rogue gets room to loop with passthrough, and
  the bigger **water pool** (cols 4–6) plus right-side **forest** stand make terrain
  exploitation pay off. Mountains + the pit pinch the lanes so positioning still matters.

Run each map **twice**: once playing every PC "to its fantasy," once trying to break it.
Note which terrain each archetype actually exploited (see §11).

---

## 9. Paper tracking templates

Minimal per-side sheets. Cross off HP boxes; update the one resource that matters.

```
PLAYERS
  Berserker  HP [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]            (14)
  Rogue      HP [ ][ ][ ][ ][ ][ ][ ][ ]   MP:__/6   moved:__  acts:[ ][ ]   (8)
  Ranger     HP [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]   ammo: N P E (circle)  shots:[ ][ ] moved≥2:[ ]   (10)
  Mage       HP [ ][ ][ ][ ][ ][ ][ ][ ]   Mana:__ (+2/turn, cap 10)   (8)

ENEMIES
  Brute 1  HP [ ][ ][ ][ ][ ][ ]      Brute 4  HP [ ][ ][ ][ ][ ][ ]
  Brute 2  HP [ ][ ][ ][ ][ ][ ]      Archer   HP [ ][ ][ ][ ]
  Brute 3  HP [ ][ ][ ][ ][ ][ ]      Brute 5  HP [ ][ ][ ][ ][ ][ ]

MAP TOKENS IN PLAY: poison(__)  frozen(__)  marked(__)  caltrops(__)  trap(__)  wall(__)
```

---

## 10. Quick-reference card (one glance at the table)

```
BERSERKER  HP14 · move2 · 1 action            ROGUE  HP8 · MP6 · 2 actions · passthrough
  Cleave    3 dmg to 3 front tiles              Backstab  5 if moved≥3 this turn, else 2 (adj)
  Charge    move4 line, 4 dmg +1 if≥3, push1    Throw     2 dmg, rng4
  Shove     push adj enemy 2 (collide=2)        QuickStep +3 MP
  Hook      pull enemy 2 (rng3 line)            Mark      next hit on target +2 (rng4)
  Whirlwind 2 dmg all 8 adj, then move1         Caltrops  enter=1 dmg & stop (within2)

RANGER  HP10 · move4 · 2 shots, move≥2 between  MAGE  HP8 · Blink5 · Mana 6 start,+2/t,cap10
  Shoot(cycle N→P→E, carries over):              Firebolt   2m  3 dmg (rng6)
    Normal   3 dmg (rng6)                        Frostbite  3m  2 dmg + skip move
    Poison   2 +1 next-turn                      Fireball   5m  3 dmg 3x3 (friendly fire!)
    Explosive 2 + 1 splash                       ConjureWall 3m  3 wall tiles (max 1 wall)
  Net   root 1 turn (rng4)  Trap enter=3&stop    Blink  teleport ≤5, free 1x/turn

ENEMY Brute HP6 mv4 atk adj 3 | Archer HP4 mv3 shoot rng5 2 | Harpy HP4 mv5 fly atk adj 2
  AI: hit lowest-HP reachable, else nearest
TERRAIN  # wall(+2)   ^ mountain(block,+3)   f forest(ignites→fire)   w water(drown unless fly/swim)
         O pit(forced in=removed)   ~ fire(2 on enter/start)
COLLISION: into wall/unit/edge/object = stop +2 (and 2 to unit hit); MOUNTAIN = +3; onto PIT/WATER = removed
MOVE cardinal only · RANGE counts diagonals · ADJACENT = 8 tiles · attacks auto-hit, damage is fixed
```

---

## 11. What to watch for (the actual point of the playtest)

For each unit, the test is **"did its turn feel like its fantasy?"** — not whether it
won. Specific questions:

- **Berserker:** Did you *want* to shove/charge into terrain, or did you just stand and
  Cleave because it was simpler? If collisions rarely mattered, the map needs more
  hazards/walls — or Shove/Hook need to hit harder.
- **Rogue:** Did the **moved-≥3** condition actually shape your pathing, or did you ignore
  it and poke with daggers? Was passthrough ever decisive? Is 8 HP too fragile to ever
  get adjacent?
- **Ranger:** Did the **forced scoot** and **ammo rotation** create interesting sequencing,
  or just feel like bookkeeping? Did zoning (Net/Trap) ever change enemy pathing?
- **Mage:** Did **banking vs. dumping** Mana create real decisions? Did friendly-fire on
  Fireball matter? Were walls useful or fiddly?
- **Across all four:** Could you tell, watching a turn, *which archetype* was acting
  without being told? If two of them played the same, that's the bug to fix. Note any
  unit that felt strictly stronger — adjust *its* numbers, not everyone's.
- **Terrain:** Did mountains / water / forest-fire drive decisions, or were they just
  scenery? Which terrain did each archetype exploit (Berserker → water/mountain shoves,
  Mage/Ranger → forest ignition, everyone → mountain cover)? Was a drown/pit removal *too*
  swingy — i.e., did one good Shove decide the fight? Note that for tuning.

**Log after each game:** which unit felt best/worst, any rule you had to make up on the
spot (that's a gap to close), and any number that felt obviously off. Feed results back
into [`units/archetype-concepts.md`](../units/archetype-concepts.md).
