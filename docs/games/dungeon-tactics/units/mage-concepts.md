# Dungeon Tactics — Mage Concepts (working doc)

> **Status: exploration.** This doc explores the Mage's design space in depth, with
> particular attention to a **zero-direct-damage** build that manipulates terrain, the
> environment, and enemy positioning to enable the rest of the party. Ideas here feed
> back into [`archetype-concepts.md`](./archetype-concepts.md) and eventually into
> [`unit-definition.md`](./unit-definition.md) once they settle.

---

## North star: the Mage rewrites the map

The current Mage mixes damage (Firebolt, Fireball) with terrain (Conjure Wall). The
design question this doc explores: **what if the damage spells were removed entirely,**
and the freed mana slots went to deeper environmental and combo tools?

The identity test: a pure-control Mage's **score** is measured in "did my wall redirect
them into the pit, did my Expose make the Berserker's shove lethal" — not in HP removed.
The Mage does the math; the Berserker and Anchor do the killing.

---

## Terrain creation & destruction

### Rend Earth
Convert any empty tile within 5 into a **permanent pit**. No damage — the payoff is that
every forced-displacement kit (Berserker Shove/Hook, Anchor pull/taunt) now has a
death-trap it didn't have to carry. Expensive mana cost (4–5) reflects the permanence:
this reshapes the map for the rest of the encounter.

### Collapse Wall
Destroy a wall tile (the Mage's own Conjure Wall, or an existing wall) and deal
**collision damage to all units adjacent** to it as rubble flies. Turns Conjure Wall into
a two-phase combo: place it to redirect enemy pathing, then detonate it for area pressure.
The Mage's own terrain becomes a delayed weapon without the Mage rolling any damage dice.

### Pillar of Fire
Place a fire tile on any empty tile within 6 — **no projectile, no LOS shot needed.**
Lets the Mage sculpt a hazard corridor rather than shooting at enemies. Pairs with the
Anchor pulling enemies through the gauntlet she laid out. Contrast with Firebolt/Fireball:
the damage is deferred and terrain-driven rather than instant and direct.

### Freeze Water
Convert a water tile to ice. Grounded units can now cross it voluntarily, but **forced
movement does not stop at the edge** — an enemy shoved toward frozen water slides across
and off the far side, traveling the full push distance. A lane opens; the Berserker's
shove lane extends dramatically. Also removes a drowning hazard as a deliberate sacrifice.

### Raise Ground
Fill a pit, creating open floor. Primarily defensive: the Mage removes a kill tile before
an ally gets shoved into it, or closes a lane the enemy is exploiting. Also lets the Mage
"spend" a Rend Earth she placed badly. Notable because it's terrain *removal* as the
useful action, not creation.

---

## Enemy debuffs (no direct damage)

### Levitate
Target is lifted; it ignores ground hazards (fire, caltrops, water) for the next turn,
but **all forced movement on it is doubled** (it can't plant its feet). Berserker Shove 2
→ enemy travels 4. The combo setup is explicit and readable from across the table — every
player can see the Mage tagged that target and knows to shove it. Cheap mana (2).

### Blind
Target loses LOS entirely for its next turn. Melee attacks still resolve if it ends the
turn adjacent to a target; ranged attacks can't fire. Pairs with the Ranger: an enemy
that can't see can't dodge, and the Ranger's Net/Trap is a guaranteed land. Also useful
against Archer enemies (makes their ranged attack do nothing for a turn).

### Slow
Target's movement reduced to 1 this turn and next (two turns of effect, applied now).
Soft kiting support: the Rogue places caltrops behind a slowed enemy that can't juke
around them; the Ranger's forced-scoot rhythm is matched to the enemy's hobbled pace.
Simple to track — one token, expires start of enemy's turn after next.

### Confuse
Target's next action is directed at a **random adjacent unit** instead of its intended
target. If two brutes are side-by-side, one might attack the other. High chaos, high
reward, very hard to predict — treat it as the expensive "break formation" option. No
damage anywhere in the effect.

---

## Party combo enablers

### Expose
Paint a target: the next **forced displacement** it suffers counts as hitting a
**mountain** (3 collision) regardless of what it actually hits — wall, unit, edge, or
open floor. A Berserker Shove into a normal wall now deals 3 instead of 2; into another
unit it deals 3 to the first and 3 to the second. Cheap mana (2), expires end of round.
The Mage's contribution to a kill is invisible on her card but obvious on the board.

### Magnetize
Link two targets within 4 of each other. When either is displaced, the other is displaced
**the same direction and distance**, stopping at walls with normal collision. Berserker
shoves one brute → both travel into the wall, both take collision. Can chain: if the
second brute is now adjacent to a third, the collision hits that too. The Mage sets up a
domino; a fighter tips it.

**Open:** does Magnetize break on collision (one-time) or persist until end of target's
next turn? One-time is easier to track; persisting is richer.

### Blink Ally
Teleport one ally to any empty tile within 5 (requires LOS to the destination). No
damage, pure logistics. Key uses:
- Drop the **Anchor** into the middle of a clustered enemy group he couldn't walk to.
- Yank the **Rogue** out of a pocket after a risky Backstab.
- Put the **Berserker** adjacent to a cluster it couldn't charge to (charge path was
  blocked, blink solves it; then Charge/Shove on that turn).
- Rescue an ally about to be surrounded on the enemy phase.

### Gravity Inversion (area)
For the next turn, all push/pull effects in a 3×3 zone are **reversed**: Shoves pull,
Hooks push, Anchor taunts repel. A Berserker Shove in the zone becomes a pull (into the
Berserker's own face — probably bad); enemies using knockback abilities pull themselves
toward you. Expensive (4–5 mana), high chaos, high ceiling. **Parked** until base kit is
stable — this is a "once the players know the rules cold" option.

---

## New movement tools

### Wind Gust
Push **all units** in a 3-tile line 1 tile away from the Mage, no damage. Mass light
displacement: enough to shove brutes off a capture tile, open a gap for the Rogue's
passthrough, or break up a cluster before the Anchor's ring-cleave. Cheap (2 mana) and
predictable — everyone can see the line.

### Wormhole
Place two linked tiles within 5 of each other. Any unit that steps onto one appears at
the other. Lasts until end of the Mage's next turn or until each portal is used once
(decide which). Enemies with dumb AI will walk into one if it's on their shortest path
(the Mage places the entry portal on the brute's route and the exit portal over a pit or
into a collision trap). The Rogue can use it to teleport mid-move. The Berserker can
route a Charge through it to extend effective distance.

**Open:** does forced movement (Shove/Hook) trigger a wormhole? Probably yes — most fun.

---

## Full no-damage build (a candidate spell list)

If the goal is zero direct damage on every card:

| Spell | Mana cost | What it does |
|---|---|---|
| **Blink** | free, 1×/turn | Teleport self to any empty tile ≤5 |
| **Conjure Wall** | 2 | 3 connected wall tiles within 4 (max 1 wall on map) |
| **Rend Earth** | 4 | One empty tile within 5 → permanent pit |
| **Expose** | 2 | Next forced displacement on target = mountain collision |
| **Levitate** | 2 | Target ignores ground hazards; all forced moves doubled |
| **Blink Ally** | 3 | Teleport one ally to any empty tile ≤5 |
| **Wind Gust** | 3 | Push all units in a 3-tile line 1 tile back |

Mana starts at 6, +2/turn, cap 10. Rend Earth (4) can be banked for on turn 2. Every
other spell is affordable on the first turn. No damage on any card — the Mage's whole
turn is logistics and setup.

**Turn feel:** Blink into position → lay Conjure Wall to redirect enemy pathing → Expose
the biggest threat → bank 1 mana. Next turn: Levitate the exposed target, call out to the
Berserker: "shove it now." The Mage's board presence is felt through the Berserker's kill.

---

## Open questions

- **Mana recovery on combo resolution?** If an ally kills an enemy using terrain the Mage
  shaped (shoved into Rend Earth pit, etc.), does the Mage regain 1–2 mana? Rewards
  "owning" the kill without rolling any damage. Risk: complex to track.
- **Schools as data tunings:** Geomancer (walls, Rend Earth, Freeze Water, Raise Ground —
  all terrain), Enchantress (Levitate, Blind, Confuse, Slow, Magnetize — all debuffs),
  Warp Mage (Blink, Blink Ally, Wormhole, Gravity Inversion — all teleportation). These
  are the same zero-damage frame with different spell lists.
- **Wormhole + forced movement:** does a shoved enemy trigger the portal? Probably yes.
- **Magnetize duration:** one-time on displacement, or persists a full turn?
- **Collapse Wall + Conjure Wall cost:** if Collapse Wall is cheap, does it make Conjure
  Wall a cheap AoE damage source by proxy? Watch the math — wall placement + collapse
  should total more mana than a direct damage spell of equivalent output.
- **Can Confuse affect PCs?** An enemy Mage or trap could Confuse a PC — does that mean
  the player running that PC picks a random adjacent target instead of their intended one?
  Interesting but hard to enforce solo.
- **Interaction with Anchor's ring:** if the Mage uses Wind Gust to push brutes *into*
  the Anchor (rather than away), does the Anchor want that? Probably yes — it fills the
  ring. This is the kind of cross-archetype synergy to test in playtest.
