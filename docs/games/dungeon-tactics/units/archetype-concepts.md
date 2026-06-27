# Dungeon Tactics — PC Archetype Concepts (working doc)

> **Status: exploration.** This is a brainstorming/working document for the *feel*
> and *identity* of each player archetype. It deliberately does **not** define data
> shapes — those live in [`unit-definition.md`](./unit-definition.md). Ideas here
> graduate into that doc (and into a coded ruleset) once they settle. Expect
> half-formed options and open questions.

---

## North star: extreme asymmetry

The redesign's goal is that **each archetype plays like a different game**, not a
different stat line. A player should pick an archetype for *how its turn feels*,
not for "more HP" or "bigger numbers." Concretely, every archetype should **max a
different design lever and be deliberately weak on others**:

| Lever | Fighter | Rogue | Ranger | Mage |
|---|---|---|---|---|
| **Mobility** | low (anchor) | **very high** (crosses the stage) | medium | teleport, fragile |
| **Direct damage** | **high** | low (conditional) | medium | **burst** (boom/bust) |
| **Battlefield control** | **high** (push/pull/collision) | low | medium (zoning) | **high** (terrain) |
| **Map interaction** | low | medium (traps/setup) | medium (zoning) | **high** (reshape walls/fog) |
| **Resource feel** | builds Fury in-turn | spends/refills Movement | rotates ammo | spends/banks Mana |
| **Turn shape** | escalating combo, rooted | run · act · run | shoot-and-scoot | burst then empty |

The test for any new idea: **does it deepen one archetype's lever while leaving
another's untouched?** If two archetypes start doing the same thing, one of them is
wrong.

---

## Fighter — the Anchor

**Fantasy.** A frontline bruiser who *doesn't chase*. The battlefield comes to
him: he hooks enemies in, plants his feet, and grinds them down with an escalating
flurry. Where the Rogue's verb is "go," the Fighter's verb is "stay and break
things." Low movement is a feature, not a weakness.

**Why it's asymmetric.** He's the inverse of the Rogue: tons to *do* but almost no
ground to cover. His turn is a **combo that builds in place**, and his reach
problem is solved by **pulling the fight to him** rather than walking to it.

### The combined concept: Stances frame, Fury fuels

You liked both **stances** and the **Fury meter** — they compose cleanly if we let
**stance be the frame and Fury be the engine**:

- **Fury** is a meter that **builds as he strikes/takes hits** and is **spent on
  finishers**. It is a numeric resource (like Mage mana), so it needs *none* of
  the deferred status system.
- **Stance** picks *what Fury does* and *how the turn is shaped*. Switching stance
  is a once-per-turn toggle (free, or costs one swing — open question).

```
                 ┌─────────────── RAGE ───────────────┐
   build Fury ──▶│ swings hit harder; Fury → big       │
   by striking   │ single-target / cleave finishers;    │
                 │ pushes enemies INTO hazards & walls   │
                 └──────────────────────────────────────┘
                 ┌─────────────── GUARD ──────────────┐
   build Fury ──▶│ Fury → control: pulls, mass-shove,   │
   by taking hits│ collision combos; reposition the     │
                 │ whole enemy formation; protect allies │
                 └──────────────────────────────────────┘
```

This single ruleset then expresses two *very* different units as pure data tunings:

- **Barbarian** — lives in RAGE: fast Fury gain, damage finishers, reckless. High
  HP, no defense.
- **Tank / Warden** — lives in GUARD: Fury spent on control & protection, thrives
  on collision damage (Into-the-Breach style: shove enemies into each other/walls
  for damage *he* never had to roll). The "damage" is the terrain doing it.

### Turn feel (RAGE example)

```
swings: 2/turn · Fury 0→6 · move 2
─────────────────────────────────────────
Hook    1sw   pull an enemy adjacent     +1 Fury
Bash    1sw   3 dmg, push 1              +2 Fury
   …Fury now 3 — could stop, or spend:
Cleave  1sw   SPEND 3 → hit all adjacent
Quake   1sw   SPEND 6 → radius push + collision, ends turn
```

The decision each turn: **cash out Fury now for a guaranteed hit, or build one
more swing toward the big finisher and risk the enemy moving out of range?**

### Open questions

- **Stance switching cost** — free once/turn, or costs a swing? Can he switch
  *mid-combo* (RAGE→GUARD to convert a damage setup into a control payoff)?
- **Fury carryover** — does Fury persist between turns (banking toward a huge
  Quake) or reset each turn? Persisting rewards patience but risks a one-shot
  alpha; resetting keeps each turn self-contained. *Leaning: small carryover cap.*
- **GUARD without statuses** — pure-control GUARD (pulls, shoves, collision) works
  today. But "protect allies" / "taunt" / "damage reduction" likely need the
  deferred status system. How much GUARD can we ship before statuses land?
- **Swings vs. movement** — separate budgets (2 swings + 2 move), or one pool he
  splits? Separate keeps the "rooted" feel crisp. *Leaning: separate.*

---

## Rogue — the Skirmisher

**Fantasy.** A blur that owns the whole map. Slips through enemies, strikes from
the dark, and is gone before the counter lands. *Going* is the whole point.

**Why it's asymmetric.** The inverse of the Fighter: covers enormous ground but
**can't bruise**. Direct damage is low and *conditional* — he has to earn it with
position (backstab from behind/flank) or setup, not raw numbers.

**Turn feel.** Move · act · move · act, governed by a **Movement pool** that some
actions *refill* — so a good turn is a chain that keeps the Rogue in motion the
entire round. Certain actions end the turn (the commit), most don't.

**Mechanical hooks (to explore):**
- **Conditional burst** — backstab deals real damage *only* from a flank/behind, or
  *only* after moving N tiles this turn. (Conditional effects were out of scope in
  the old framework — revisit; this archetype may force the issue.)
- **Setup over damage** — mark a target, plant caltrops/traps, steal an enemy
  action/item, blind. The Rogue *enables* kills more than landing them.
- **Reposition self & others** — swap places with a unit, pull an ally out of
  danger, yank an enemy off an objective.
- **Pass-through everything** — `passthrough: [enemy_units]`, maybe diagonal. He
  treats the enemy formation as open ground (balance TBD per the brief).

**Open questions.** How does low damage stay *fun* and not just weak? (Answer is
probably "the map is your weapon": hazards, collisions you set up, and enabling
allies.) Does the Rogue have a resource besides Movement, or is mobility the whole
economy?

---

## Ranger — the Kiter

**Fantasy.** A patient hunter who never stands still. Every shot is followed by a
step back; he wins by controlling space and dictating where the enemy *can't* go.

**Why it's asymmetric.** Defined by a **constraint**: *forced to move between
actions.* He can't plant and turret like a Mage, and can't brawl like a Fighter —
he must keep a rhythm of shoot-and-scoot. Damage is medium; the edge is **utility
and zoning** over burst.

**Turn feel.** Shoot → must step → shoot. A **rotating ammo** signature (normal →
poison → exploding → …) means his best tool changes every shot, so the turn is
about *sequencing the rotation* with positioning.

**Mechanical hooks (to explore):**
- **Ammo rotation** as the core identity — each arrow a different effect; the cycle
  is the puzzle. (Does rotation persist across turns? Can he "skip" to line up a
  shot?)
- **Zoning kit** — caltrops, nets (root/stun), tripwires, a thrown spear that
  blocks a lane. Area denial that shapes enemy pathing.
- **Anti-mobility** — counters the very thing the Rogue/Mage rely on (root, slow,
  difficult terrain). Natural rock-paper-scissors against high-mobility archetypes.

**Open questions.** Is the forced-move a hard rule (can't act twice without moving)
or a soft incentive? How much of the kit is *damage* vs *control*? Does he have a
"hold position" exception (overwatch/ready-shot)?

---

## Mage — the Artillery / Controller

**Fantasy.** A glass cannon that **rewrites the map**. Blinks across the field,
drops walls and fire, then unloads mana in a single devastating turn — and stands
exposed afterward.

**Why it's asymmetric.** Two unique levers: **terrain authorship** (create/destroy
walls, fog, fire) and a **boom/bust mana economy**. Fragile and teleport-mobile —
unlike the Fighter, he can be *anywhere*, but unlike the Rogue, being there is
dangerous.

**Turn feel.** Teleport freely between casts, spending Mana on spells of varying
cost. A turn can be one huge spell or several small ones; then he's tapped and
vulnerable.

**Mechanical hooks (to explore):**
- **Map manipulation** — `create_wall` / `destroy_wall` reshape lanes; `wall_of_fire`
  and `obscuring_fog` (costs extra movement to cross) zone the field. The Mage
  changes the *board*, not just the units.
- **Mana banking vs. dumping** — does unspent Mana carry over (charge a nuke) or
  reset? The boom/bust tension.
- **Hard control** — freeze (skip a target's action), already expressible via
  `effect.status`. Bigger control (mind-control, polymorph) waits on the status
  system.
- **Schools as data tunings** — Geomancer (walls/earth), Pyromancer (fire/zoning),
  Cryomancer (freeze/slow) are all the `mage` ruleset with different spell lists.

**Open questions.** Teleport-only movement: does it ignore LOS entirely, and is it
capped per turn or per cast? How do we keep terrain-authoring from making the map
unreadable (limits on simultaneous walls/fog)?

---

## Enemies

Not covered here — enemies use the simple **`brute`** model (one move, then one
attack) defined in [`unit-definition.md`](./unit-definition.md). PC asymmetry is
the focus of this doc.

---

## Parking lot / cross-cutting

- **Conditional effects** (flank/backstab bonuses, "after moving N") keep coming up
  — especially for the Rogue. The old framework deferred these; the asymmetry goal
  may force a small `conditions` block sooner than planned.
- **Status system** gates the richest versions of GUARD-stance protection, taunt,
  and Mage hard-control. Track what each archetype can ship *before* statuses land
  vs. *after*.
- **Resource carryover** is an open question shared by Fighter (Fury), Mage (Mana),
  and Rogue (Movement refill) — decide a consistent stance on banking vs. reset.
- **Rock-paper-scissors** — note emerging counters (Ranger zoning vs. Rogue/Mage
  mobility; Fighter pull vs. Ranger kite). Asymmetry is most fun when matchups have
  texture.
