# Into the Breach — Enemy Design Reference

> **Purpose.** A reference doc summarizing how *Into the Breach* (Subset Games) designs
> its enemies, distilled as inspiration for Dungeon Tactics enemy design. The goal is
> **mechanic ideas**, not a copy of the game. Cross-reference with
> [`units/archetype-concepts.md`](./units/archetype-concepts.md) for how these ideas
> might interact with our PC archetypes.
>
> Source: [The Vek Bestiary (Steam Guide)](https://steamcommunity.com/sharedfiles/filedetails/?id=2849327763)
> and the [Into the Breach Wiki (Fandom)](https://intothebreach.fandom.com/wiki/Vek).

---

## The foundational mechanic: telegraphed intent

**The most important design principle in Into the Breach is that enemies always show
their plan before they execute it.** On the enemy turn, every active Vek moves to its
target tile and *marks its attack target* — a visible red indicator on the board — then
waits. The player then takes their full turn *knowing exactly what will happen* unless
they intervene. Attacks execute at the end of the round unless the enemy is displaced,
killed, or the target is removed from the marked tile.

This inverts the typical action-game loop: instead of *reacting to what happened*, the
player is always solving the puzzle of *what is about to happen*. Three valid responses:
1. **Move the target** out of the marked tile.
2. **Push the enemy** so its attack lands somewhere harmless.
3. **Kill the enemy** before it fires.

The entire game is built on that three-part response menu. For Dungeon Tactics: enemies
already telegraph to some degree (brutes move then attack); the richer question is whether
PC abilities interact with the *planned attack itself* (see the Anchor's enrage idea —
bending an aimed attack onto himself).

---

## Core enemy roster

### Tier 1 — basic enemies

**Firefly**
- Ranged shot in a straight line; hits the first thing in the projectile's path.
- *Key mechanic:* lateral displacement matters — push the Firefly sideways one tile and
  its aimed shot now misses entirely (the line has changed). Pushing the *target* out of
  the line works too. Either disruption is valid.
- *Dungeon Tactics inspiration:* a ranged enemy whose attack line can be bent by the
  Berserker's shove or the Anchor's hook is a richer puzzle than one that just shoots.

**Hornet**
- Flying; ignores terrain (moves over water, pits, mountains). Cannot be knocked into
  water or chasms because it flies — standard displacement still moves it, but can't kill
  it via terrain.
- Stabs for 1 damage; Alpha Hornet stabs *two tiles forward* for 2 damage.
- *Key mechanic:* the flying trait nullifies the primary environmental kill condition
  (drown / fall). The counter is direct damage, not clever positioning.
- *Dungeon Tactics inspiration:* a flying enemy type would make our water/pit terrain
  irrelevant for that enemy, forcing direct damage from our DPS archetypes.

**Leaper**
- Jumps over all obstacles directly to its target, bypassing walls and units.
- Webs the target (immobilizes it) and deals heavy damage (3 base, 5 Alpha).
- *Key mechanic:* only 1 HP — extremely fragile. High threat, trivial to kill. The risk
  is letting it land.
- *Dungeon Tactics inspiration:* a fragile-but-threatening gap-closer. In our system,
  web = the frozen/root status. The Leaper creates urgency: kill it before its turn, or
  lose a unit's movement for a round.

**Scarab / Scorpion**
- Webs *all* adjacent targets simultaneously before attacking adjacent targets.
- *Key mechanic:* mass-webs a cluster of units, then melees. The AoE web is the real
  threat — it pins multiple PCs, letting other enemies act without counterplay.
- *Dungeon Tactics inspiration:* a mass-root enemy that punishes tight formation play.
  The Rogue and Ranger want to scatter; the Anchor wants to cluster — this enemy makes
  the Anchor's ring dangerous to hold.

---

### Tier 2 — complex enemies

**Burrower**
- **Immune to knockback.** Cannot be displaced by any push or pull effect.
- Attacks 3 tiles in a row (a line), dealing 1 damage to each. Retreats (moves away)
  after taking damage.
- Alpha: same 3-tile line for 2 damage each.
- *Key mechanic:* knockback immunity completely removes the Berserker and Anchor's primary
  control tools. The counter is direct damage only, not clever shoves.
- *Dungeon Tactics inspiration:* immunity to a whole verb class is a stark, clean
  mechanic. An enemy that can't be pushed forces the Berserker to actually deal damage
  instead of using the terrain. Creates a hard counter to the "shove into hazard" gameplan.

**Spider**
- Does not attack directly. Each turn, deploys egg sacs onto the board.
- Eggs hatch into **Spiderlings** that web (root) all units adjacent to them.
- *Key mechanic:* the Spider itself is harmless; the threat is the web field it creates.
  If you ignore it, the board slowly fills with immobilizing zones. Must be killed
  proactively, not reactively.
- *Dungeon Tactics inspiration:* a spawner whose product — not the enemy itself — is the
  actual threat. Introduces kill-priority decisions: do you deal with the eggs/spiderlings
  or pressure the Spider directly?

**Digger**
- Creates rocks (blocking terrain) in adjacent free tiles, then damages all surrounding
  tiles.
- *Key mechanic:* the rocks it creates constrain its own attack (fewer free tiles = fewer
  rocks = fewer targets hit). The environment it's building is both its setup and its
  limiter. Players can manipulate this by filling tiles near the Digger (with friendly
  units, traps, objects) before it acts.
- *Dungeon Tactics inspiration:* an enemy that modifies terrain as part of its attack
  pattern. Creates map geometry as a side effect of existing.

**Beetle**
- Charges forward in a straight line, dealing damage and pushing the target back.
- Alpha: 3 damage + push.
- *Key mechanic:* a linear charge that can be redirected by turning the Beetle 90° before
  it fires (push it sideways). Also can be exploited — let the Beetle push your Berserker
  into a favorable position.
- *Dungeon Tactics inspiration:* an enemy that uses the same charge/knockback primitives
  as the Berserker. Mirror-image: the player might bait the Beetle's charge to do useful
  work (move a teammate, knock another enemy).

**Crab**
- Artillery attacker. Lobs shots at two separate tiles within range 5, 1 damage each
  (Alpha: 3 damage).
- *Key mechanic:* long range, multi-target artillery. Can't easily be body-blocked because
  it aims at two separate locations simultaneously.
- *Dungeon Tactics inspiration:* a ranged enemy that forces split attention — you can't
  cover both targets with one unit.

**Centipede**
- Fires A.C.I.D. projectiles. A.C.I.D. damages adjacent tiles to the target and applies a
  debuff: affected targets **take double damage** until the acid is removed.
- *Key mechanic:* creates a persistent vulnerability state on targets. Combines a damage
  source with a damage amplifier — allies near the acid target also take splash.
- *Dungeon Tactics inspiration:* an enemy that applies the **Vulnerable/Exposed** status
  (our "takes +X% from the next hit" concept). If the Centipede acid-marks the Anchor, he
  suddenly wants to *not* be surrounded by enemies targeting him.

**Blobber** (rare)
- Keeps distance from players. Spawns Blob units onto tiles across from it.
- Blobs explode at end of the enemy turn, dealing 1 to all adjacent tiles.
- Blobs can be destroyed before they detonate.
- *Key mechanic:* creates two separate problems — the Blobber (repositioning, placing
  threats) and the Blobs (time-bomb area denial). Managing one without the other fails.
- *Dungeon Tactics inspiration:* a split-objective enemy. The Ranger's trap/caltrops
  mechanic already has this flavor — something placed earlier becomes the real threat.

---

### Advanced Edition enemies

**Bouncer**
- Melee attacker that **damages itself backward** on every attack — when it hits forward,
  it knocks itself back one tile, potentially into another unit for collision damage.
- *Key mechanic:* self-displacement on attack. Can hit two targets in one turn (forward
  target + whatever it flies backward into). Cannot be flipped or redirected to weaponize
  the recoil against it.
- *Dungeon Tactics inspiration:* an enemy that generates its own forced movement as a
  byproduct of attacking — the Berserker mirror again, but self-directed.

**Gastropod**
- Fires a grappling hook. Deals 1 damage to the target and pulls it toward the Gastropod —
  or, if the target is too heavy/immovable, pulls the Gastropod toward the target instead.
- *Key mechanic:* a hook that works bidirectionally based on relative weight/mass. Against
  a light unit it's a pull; against a heavy structure it becomes self-movement.
- *Dungeon Tactics inspiration:* directly maps to the Anchor's hook primitive. An enemy
  hook that can reel in PCs is an interesting threat — it drags the Rogue or Mage into
  melee range.

**Moth** (flying)
- Flying artillery. Fires arcing projectiles *and* **pushes itself backward** on each
  shot (recoil self-displacement).
- Immune to water and chasm terrain (flying).
- *Key mechanic:* the recoil from firing moves the Moth itself — its aim changes between
  shots because it relocates after each one. Can hit two different areas in one turn
  (initial position + post-recoil position).
- *Dungeon Tactics inspiration:* an enemy that self-repositions as part of attacking,
  making its effective range a moving target.

**Plasmodia** (rare spawner)
- Slow movement. Fires a Spore via artillery range.
- The Spore lands and then, on the *following turn*, destroys itself to fire a 1-damage
  push projectile in a direction.
- *Key mechanic:* two-stage, two-turn delayed effect. Turn 1: Spore lands. Turn 2: Spore
  fires. Creates a time-bomb that pushes a target if the Spore isn't destroyed first.
- *Dungeon Tactics inspiration:* a delayed-fuse mechanic that creates intermediate
  objectives (kill the Spore before it fires). Forces the party to split attention between
  the Plasmodia and its placed Spores.

**Tumblebug** (rare)
- Summons an Unstable Boulder onto the board, then *threatens to strike it* — which would
  cause the Boulder to explode, dealing 1 damage to all tiles adjacent to it (including
  the Tumblebug itself).
- *Key mechanic:* creates terrain (the Boulder blocks movement) then uses that terrain as
  a bomb. The Boulder can be destroyed before the Tumblebug detonates it. The Tumblebug
  takes self-damage from its own explosion, so cornering it near its Boulder can kill it.
- *Dungeon Tactics inspiration:* the Mage's Collapse Wall reads like a PC version of this
  — create terrain, then weaponize it. An enemy that does the same creates a board-reading
  puzzle.

---

## Psions — the buff layer

Psions are **support enemies that make all other enemies stronger**, but are themselves
weak and non-threatening in isolation. One Psion appears per area, applying a persistent
aura to all other Vek. The aura drops the instant the Psion dies — making the Psion the
highest-priority target when present, but a squishy one that draws fire while your team
ignores everything else.

**Psion variants (examples):**
| Psion type | Effect on all other Vek |
|---|---|
| Soldier | +1 HP to every other Vek |
| Healer | Restores HP to damaged Vek each turn |
| Armored | Grants armor (reduces next hit by 1) to all Vek |
| Exploding | Vek deal AoE splash on death |
| Amplifier | Vek deal increased damage |
| Spawner | Defeated Vek spawn a new Vek on death |

*Key design insight:* the Psion creates a **hidden multiplier** on every other enemy.
Killing a 1-HP Psion immediately nerfs every other enemy on the board. This is one of the
most interesting priority-decision mechanics in the game — do you kill the Psion first
(removing the buff layer) or handle the more immediate threats?

*Dungeon Tactics inspiration:* we don't have this yet. A "commander" enemy that buffs the
brutes around it while being fragile would create exactly this priority-decision texture.
The Anchor's pull kit could yank the commander out of position to deny the aura; the Mage
could wall it off from its allies.

---

## Trait vocabulary (cross-cutting modifiers)

Individual enemies are built from a shared set of traits that modify behavior. These are
the building blocks, not the whole unit:

| Trait | Effect |
|---|---|
| **Flying** | Immune to drowning and pit removal; knockback still applies but can't use terrain kills |
| **Knockback-immune** | Cannot be displaced by any push, pull, or hook effect |
| **Armored** | First hit per combat deals 0 damage (armor is a HP layer, not a percentage) |
| **Massive / Leader** | Cannot be drowned or pit-killed; usually the alpha-plus tier |
| **Rare** | Only 1 or 2 may exist on the map at a time; can't appear on first island |
| **Self-damage** | Takes damage from its own attack (Bouncer, Tumblebug) |
| **Terrain-creator** | Modifies map during its turn (Digger, Tumblebug, Spider eggs) |
| **Spawner** | Creates new units as its primary action (Spider, Plasmodia) |

---

## Design lessons for Dungeon Tactics

1. **Immunity to one verb forces players to use another.** Burrower (no knockback) forces
   direct damage. A flying enemy ignores pit/water kills. Choosing which verb to immune
   out defines which PC archetype is the "wrong" answer for that enemy — and which is the
   "right" one.

2. **Spawners create priority conflicts, not just more HP.** The Spider doesn't threaten
   HP — it threatens the board state. Players must decide between solving the root cause
   (kill the spawner) vs. clearing the product (destroy the eggs). Both are valid; neither
   is automatic.

3. **Self-recoil / self-damage opens creative counter-play.** Bouncer and Tumblebug hurt
   themselves. Players can engineer situations where the enemy's own attack damages it
   (corner a Tumblebug next to its Boulder). This is agency-through-environment, which
   maps perfectly onto the Berserker's collision fantasy.

4. **Two-stage / delayed effects create intermediate objectives.** Blobber Blobs and
   Plasmodia Spores are "kill this before it fires" sub-goals that interrupt the main flow.
   They make the party split attention without adding a new full enemy.

5. **The Psion priority question is one of the best "read the board" moments in the game.**
   A fragile support enemy that amplifies everything else is a high-skill read — kill it
   and nerf the whole wave, or handle the immediate threat and fight the buffed brutes. Our
   equivalent doesn't exist yet.

6. **Telegraphed attacks pair perfectly with our PC control kits.** The Anchor's hook, the
   Berserker's shove, the Ranger's Net, the Mage's Blink Ally — all of these are most
   satisfying when used to disrupt a *telegraphed enemy plan* rather than react to *damage
   already taken*. Even simple "show the attack arrow before it fires" adds a full decision
   layer.
