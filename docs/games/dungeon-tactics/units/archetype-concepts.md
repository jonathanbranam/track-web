# Dungeon Tactics — PC Archetype Concepts (working doc)

> **Status: exploration.** This is a brainstorming/working document for the *feel*
> and *identity* of each player archetype. It deliberately does **not** define data
> shapes — those live in [`unit-definition.md`](./unit-definition.md). Ideas here
> graduate into that doc (and into a coded ruleset) once they settle. Expect
> half-formed options and open questions. The point of this pass is to **name every
> concept and lay out its possibilities**, not to commit to implementation.

---

## North star: extreme asymmetry

The redesign's goal is that **each archetype plays like a different game**, not a
different stat line. A player should pick an archetype for *how its turn feels*,
not for "more HP" or "bigger numbers." Concretely, every archetype should **max a
different design lever and be deliberately weak on others**:

| Lever | Anchor | Berserker | Rogue | Ranger | Mage |
|---|---|---|---|---|---|
| **Mobility** | **none** (rooted, rewarded) | action-bound; moves self & enemies | **very high** (free pool) | medium | teleport, fragile |
| **Direct damage** | **high** (scales when surrounded) | **high** (contact + collision) | low (conditional) | medium | **burst** (boom/bust) |
| **Battlefield control** | **high** (pull/taunt/enrage) | **high** (push/pull/collision) | low | medium (zoning) | **high** (terrain) |
| **Map interaction** | low | medium (shoves into terrain/hazards) | medium (traps/setup) | medium (zoning) | **high** (reshape walls/fog) |
| **Resource feel** | builds Fury by holding still | momentum from attack-moves | spends/refills Movement | rotates ammo | spends/banks Mana |
| **Turn shape** | root · pull · grind | charge · shove · collide | run · act · run | shoot-and-scoot | burst then empty |

The test for any new idea: **does it deepen one archetype's lever while leaving
another's untouched?** If two archetypes start doing the same thing, one of them is
wrong.

---

## The Fighter splits in two

There is no single "Fighter." The melee identity **fractures into two archetypes
that want opposite things from the map**, plus **two reusable mechanic modules** —
*Stances* and *Fury* — that either archetype (or future melee) can bolt on.

- **[Anchor — the Rooted Fighter](#anchor--the-rooted-fighter)**: wants to move as
  little as possible and drags the battle to him.
- **[Berserker — the Kinetic Fighter](#berserker--the-kinetic-fighter)**: treats position
  as a weapon — moves *through* his attacks and shoves enemies into walls, hazards, and
  each other. Never the open-ground sprinter the Rogue is.

The two mechanic modules are explored first because they're **orthogonal** to the
archetypes: a fighter can have Fury without Stances, Stances without Fury, both, or
neither. Treat them as parts on a shelf, not as the definition of either fighter.

---

## Mechanic module: Stances

A **stance** is a *mode that re-skins the fighter's whole action set* for a stretch of
time. It is not a single ability — it changes the frame the turn happens inside.

**What a stance can change:**
- **Which actions are available** (a finisher exists only in RAGE; a pull exists only
  in GUARD).
- **What existing actions do** (the same "Bash" pushes in RAGE, pulls in GUARD).
- **How a resource behaves** (Fury builds faster in one stance, spends differently in
  another).

**Example pair — RAGE / GUARD** (the clean two-stance shape):

```
                 ┌─────────────── RAGE ───────────────┐
                 │ swings hit harder; resource → big    │
                 │ single-target / cleave finishers;    │
                 │ pushes enemies INTO hazards & walls   │
                 └──────────────────────────────────────┘
                 ┌─────────────── GUARD ──────────────┐
                 │ resource → control: pulls, mass-shove,│
                 │ collision combos; reposition the     │
                 │ whole enemy formation; protect allies │
                 └──────────────────────────────────────┘
```

### Switching must be weighty

The core design rule: **a stance switch is a heavy, deliberate decision.** A stance is
meaningless if a fighter can flip it before every action — then it's just a menu.
Options for the switching cost, from heaviest to lightest:

- **Locked for a full turn** — you choose a stance at the *start* of your turn and are
  committed to it until your next turn. Maximum weight: a stance is a turn-level bet on
  how the round will go.
- **Locked for N actions** — switching mid-turn is allowed, but only after you've spent
  a cooldown of N actions in the current stance. Lets a fighter set up in one stance
  and pay off in another, but never freely.
- **Once per turn** — exactly one switch per turn, at any moment. Lighter; rewards
  reading the board mid-combo (e.g., RAGE→GUARD to convert a damage setup into a
  control payoff).

**Non-negotiable: never per-action switching.** If the stance can change before each
attack it carries no decision weight and should be cut.

**Open questions:**
- **Two stances or more?** RAGE/GUARD is the clean pair. A third "mobility" stance
  starts blurring into the Berserker — probably a sign it doesn't belong on the Anchor.
- **Does switching cost an action/swing, or is it free-but-locked?** (Free-but-locked
  keeps the cost in *commitment* rather than tempo.)
- **Can a stance be forced?** e.g., a heavy stagger knocks the fighter out of GUARD, or
  a debuff locks him in one stance for a turn.
- **Do stances gate Fury finishers, or just retune them?** (Are some finishers legal
  only in a given stance, or does every finisher exist in both with different effects?)

---

## Mechanic module: Fury

**Fury** is a **numeric meter that builds through combat and is spent on finishers** —
explored here *independent of stances*. Because it's a plain number (like Mage mana),
it needs **none** of the deferred-status system. Three orthogonal knobs: **how it
builds**, **how it's spent**, and **whether it carries over**.

**How Fury builds** (pick one or mix):
- **On striking** — every hit landed grants Fury. Rewards aggression; natural fit for
  the **Berserker**.
- **On taking hits** — soaking damage builds Fury. Rewards holding the line; natural
  fit for the **Anchor**.
- **On standing still** — Fury per turn spent rooted, or per step *not* taken this
  turn. The rooted-fighter signature (see Anchor).
- **On kill / on collision** — bonus Fury for terrain or collision kills (the board did
  the work, the fighter banks the reward).

**How Fury is spent:**
- **Finishers** — single-target execute, cleave-all-adjacent, radius push + collision
  (the "Quake"). Bigger spends = bigger board swings.
- **Sustained burn** — instead of one burst, spend Fury to *stay* enraged for a few
  actions (a simmer rather than a boom).

**Carryover:**
- **Reset each turn** — self-contained turns; no alpha-strike risk.
- **Bank with a cap** — rewards patience without enabling a one-shot. *Leaning here.*
- **Full bank** — charge a huge nuke over several turns; the most swingy, most
  dangerous to balance.

**Note on ownership:** Fury is the obvious resource for the **Anchor** (build by
holding still / taking hits) but a **Berserker** could build the *same meter* through
momentum on attack-moves — same number, opposite fuel. Decide whether the two fighters
share one Fury rule or each gets its own flavor.

---

## Anchor — the Rooted Fighter

**Fantasy.** The immovable object. He wants to **move as little as possible** and makes
the battlefield come to *him*. Where every other archetype asks "where do I go?", the
Anchor asks "how do I make *them* come *here*?" Low movement isn't a weakness he
tolerates — it's the thing he's built around.

### The rooted reward: standing still makes him stronger

The signature inversion: **not moving is an active, rewarded choice.** The fewer tiles
he moves (this turn, or across consecutive turns held), the more he gains — Fury,
damage, or a stacking "dug-in" bonus. Moving spends or resets it.

- **Open:** does the bonus scale with *steps-not-taken this turn*, or with *turns held
  on a tile*? Is there a cap (to avoid an unkillable turtle)? Does a single forced shove
  knock him loose and reset the stack — and is that the main counterplay against him?

### Pulling the fight in

Since he won't chase, he **drags**:

- **Hook / whip / chain** — target an enemy at range and *physically yank it* adjacent
  (or N tiles closer). The Anchor's primary reach tool; relocates one enemy *now*.
- **Taunt** — *compels enemy movement toward him*, resolved **immediately on his turn**
  (not a deferred status). Variants to explore:
  - **Single-target taunt** — one enemy is compelled to approach (and perhaps must
    target him on its next turn).
  - **Area taunt** — every enemy within radius R is pulled/compelled toward him. Mass
    aggro, at the price of being surrounded.
  - **Soft vs. hard** — *soft* = the enemy only *moves* toward him this turn; *hard* =
    it is also forced to *attack him* next.
- **Hook vs. taunt distinction:** the hook *relocates* one enemy by force; the taunt
  *changes where enemies choose or are forced to go.* They stack — hook one in, taunt
  the rest toward you.

### Enrage — what does it actually target?

The most interesting open lever. Enrage can act on:

- **The enemy's next turn** (classic) — the enraged enemy's *upcoming* turn is altered:
  forced to charge the Anchor, attack recklessly, or ignore all other targets.
- **The enemy's already-planned / current action** (the alternative worth exploring) —
  **immediately bend an attack that's already aimed**. The Anchor enrages the enemy
  about to strike the Mage, and the blow lands on *him* instead. This turns enrage into
  a **body-block**: a way to defend an ally or a structure on the *same* tick the threat
  resolves, not a turn later.

- **Open:** single-target or area enrage? Does it stack with taunt (taunt walks them in,
  enrage makes them swing at him)? Can he enrage to *peel* an attack off an objective
  he's guarding?

### Surrounded: the payoff for pulling them in

The Anchor's reward loop closes here. Where the Rogue fears being surrounded, the Anchor
**wants** it — **his power scales with the number of enemies adjacent to (or surrounding)
him.** The more tiles around him are occupied by enemies, the harder he hits. This is the
direct payoff for the pull/taunt/enrage kit: spend the early turn *drawing the crowd in*,
then unleash a devastating attack into a packed ring.

Pushed to its limit, **being surrounded is his ideal board state** — every other tool he
owns (root, hook, taunt, enrage) exists to *manufacture and maintain* that ring.

- **What scales:** not just AoE attacks — **single-target attacks too** can gain damage
  per adjacent enemy. "Surrounded" is a buff on his *whole* action set, not one move.
- **What the trigger grants** — flat bonus damage is only the simplest payoff. In rising
  order of how hard it commits the archetype to the fantasy:
  - **At time of attack** — the strike counts adjacent enemies *right now* and scales its
    damage/effect. Rewards sequencing (pull, then hit).
  - **A status on start-of-turn surrounded** — *beginning* his turn ringed applies a
    special status (a stacking "Bulwark"/"Bloodbath": bonus damage, Fury, or defense for
    the turn). Rewards holding a position the enemy crowded into last round.
  - **A status on end-of-turn surrounded** — *ending* his turn ringed applies the status —
    rewards actively baiting the cluster and committing to stay inside it. (These two are
    where the **status system** does real work — they're deferred effects, not instant;
    see [Statuses](#statuses-setup-for-the-kill).)
  - **Surrounded-gated actions** — the strongest expression: certain attacks/actions
    **can only be performed while surrounded** (or while N+ enemies are adjacent). The
    devastating ring-cleave isn't merely *better* when boxed in — it's *unavailable*
    unless he is. This is what makes "always be surrounded" his literal win condition
    rather than a nice-to-have.
- **Thresholds vs. linear** — does each adjacent enemy add a flat increment (linear), or
  are there breakpoints (2+ = bonus, 4+ = bigger, fully-surrounded-by-8 = max)? Breakpoints
  read more cleanly and create explicit "one more enemy" decisions.
- **Counterplay** — the obvious counter is *spacing*: a smart opponent refuses to cluster,
  which is exactly why the Anchor needs **forced** pull/taunt to manufacture the crowd the
  enemy won't volunteer. This is the tension that makes the loop a game, not a guarantee.
- See [Targeting shapes](#targeting-shapes-a-missing-primitive) for the AoE patterns
  ("all eight surrounding," "the three tiles on one facing") this archetype leans on.

### Weaknesses & tunings

Little to no map mobility; vulnerable to kiting (Ranger) and to being *ignored* if his
pull/taunt range is out-ranged. His whole answer is **reach (hook), compulsion (taunt),
and punishing anyone who steps close.** Likely data tunings: a **Barbarian** (rooted,
Fury-from-standing-still, RAGE-leaning, reckless) and a **Warden/Tank** (GUARD-leaning,
control and collision, protects allies) are both *this* archetype with different
parts bolted on.

---

## Berserker — the Kinetic Fighter

**Fantasy.** A fighter who is **always in motion, but only through violence** — and who
treats *position itself* as a weapon. The "movement fighter" and the "fighter who shoves
enemies around the board" are **one archetype**: both are about **kinetics**. His own
movement is welded to his attacks, and his attacks fling enemies into walls, hazards, and
each other. His goal isn't only to lower an enemy's HP — it's to **change where that enemy
is standing**.

The unifying idea: **things collide when they move.** Whether he charges himself *into* an
enemy or shoves an enemy *into* a wall, the board (terrain + other units) does damage he
never had to roll.

### Self-movement: embedded in actions

He may have a *small* pool of ordinary movement, but his **real repositioning is bundled
inside attacks** — the "where" and the "what" are the same decision:

- **Charge** — move up to N tiles in a line *and* hit the target at the end. Damage may
  **scale with distance traveled** (a long run-up hits harder), and the hit can **knock
  the target back** into whatever's behind it.
- **Whirlwind / spin** — move 1–2 tiles while striking *every adjacent enemy* along the
  path. Reposition + AoE in a single verb.
- **Leap / pounce** — jump a gap onto a target, with a slam (and shove) on landing.
- **General shape:** any movement he performs is **attached to and justified by an
  attack.** No attack, no big move.

### Enemy-displacement: position as the payoff

The same kinetics turned outward — he moves *enemies*, and the collision is the point:

- **Push family** — shove, shield-bash, charge-knockback: drive an enemy **away**, ideally
  into a wall, a hazard (fire/pit/spikes), or another unit for **collision damage**.
- **Pull** — a **hook/chain** that drags an enemy **toward** him or, more interestingly,
  into a hazard or into a chain-reaction pileup. (Pull and push are the same primitive
  with opposite sign.)
- **Knock prone / off-objective** — displacement as control: shove an enemy off a capture
  tile, out of a chokepoint, or out of its own formation.
- **Terrain & unit interaction** is the whole game here: a shove into open floor is weak; a
  shove into a wall, a hazard, or a clustered pack is devastating. He's a **physics
  engine**, and the map is his damage.

### The asymmetry line vs. the Anchor (open, deliberate)

Push, pull, hook, taunt, and enrage are *all* "move the enemy" verbs, so they could land on
either fighter. To keep the two from blurring, the cleanest split is by **reference
frame**, not by which verbs each owns:

- **Anchor = self-referenced + compulsion.** His forced movement is always **toward
  himself** (he wants the ring), and he prefers **compulsion** — *taunt/enrage*, where the
  enemy moves or attacks under its own power because he made it. Static center of gravity.
- **Berserker = board-referenced + direct displacement.** His forced movement is relative
  to **walls, hazards, objectives, and other units** — *toward or away from him is
  incidental*; what matters is *what they hit*. He **physically relocates** enemies (shove,
  bash, knockback, hook-into-hazard) rather than compelling them. Mobile, board-rearranging.

So the same `hook` primitive reads differently per archetype: the **Anchor's hook** yanks
an enemy *adjacent to him* (feed the ring); the **Berserker's hook** yanks an enemy *into a
hazard or a pileup* (cause a collision). *Open: do we hard-split the verbs (taunt/enrage =
Anchor only; knockback-collision = Berserker only), or share the primitives and let the
reference frame + which targeting shapes each gets do the differentiating?*

### Deliberately parked: the "bloodlust / zombie" free-move

A sustained **free-movement mode** (move freely on every kill/hit) is tempting but
**likely overpowered** — it hands the Berserker the Rogue's free-movement economy and
deletes the action-bound constraint that defines his self-movement. **Parked** unless we
find a hard limiter (e.g., only on a kill, only once per turn, only in a straight line).

### Open questions

- Does charge *distance* build Fury (momentum → meter), or is the hit its own reward?
- Can charge attacks **chain** (carry momentum from one target into the next)?
- **Collision damage** — flat, or scaled by distance shoved / what was hit (wall vs.
  hazard vs. another unit)? Does a multi-unit pileup damage *everyone* in the chain?
- Does displacement get **easier against [statuses](#statuses-setup-for-the-kill)** — e.g.,
  a prone or stunned enemy can't brace and is shoved further?
- Do **stances** fit him (an offense/displacement pair), or is his identity already full?

---

## Rogue — the Skirmisher

**Fantasy.** A blur that owns the whole map. Slips through enemies, strikes from
the dark, and is gone before the counter lands. *Going* is the whole point.

**Why it's asymmetric.** The inverse of the Anchor: covers enormous ground but
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
unlike the Anchor, he can be *anywhere*, but unlike the Rogue, being there is
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

## Targeting shapes: a missing primitive

A gap surfaced by the Anchor (cleave-the-ring) and Berserker (whirlwind): the design
needs a **shared vocabulary of attack target shapes** — *which tiles/units a single
action hits.* This is a cross-cutting primitive, not a fighter-only idea (the Mage's
AoE and the Ranger's lanes draw on the same set). The concrete enum lives in
[`unit-definition.md`](./unit-definition.md); here we just name the possibilities.

**Single / point**
- **Single target** — one unit (the baseline).

**Self-centered area** (origin = the attacker's own tile)
- **All eight surrounding tiles** — the full ring; the Anchor's "surrounded" finisher.
- **Four cardinal-adjacent** — N/S/E/W only.
- **Four diagonal-adjacent** — corners only.
- **Radius R** — every unit within R tiles (bigger AoE; more Mage-flavored).

**Facing-based** (a direction the attacker chooses — the concept most clearly missing)
- **One facing** — the **three tiles directly along one side** (e.g., the three to the
  north), letting a fighter sweep an entire flank in one swing. Choose N, S, E, or W.
- **Line / lane** — a straight line outward (length L) along a facing; pairs naturally
  with the Berserker's charge and the Ranger's lane-block.
- **Cone** — widens with distance along a facing (a Mage/breath shape).

**Target-centered area** (origin = the chosen target's tile, not the attacker's)
- **All units around a target** — splash on the unit struck (vs. splash around *self*).
- **All units in front of a target** — the facing-shape, but projected from the target.

**Cross-cutting open questions:**
- Do self-centered shapes scale with the Anchor's *surrounded* buff (more tiles hit =
  more damage), tying the two concepts together?
- Are facings a property the unit *tracks* (it has an orientation), or chosen fresh per
  attack? Tracking facings adds a positioning layer; choosing-fresh is simpler.
- Which shapes are PC-only vs. available to the `brute` enemy model?

---

## Statuses: setup for the kill

This is where **asymmetry becomes synergy** — the texture that makes a *party* more than a
pile of solo turns. The fragile, low-damage archetypes (**Mage**, **Rogue**) don't kill so
much as **soften and set up**; the fighters **cash in**. A status applied by one unit
changes what every other unit's turn is worth.

The pattern: **inflict → exploit.** Mage/Rogue/traps inflict a condition; the fighters do
more damage, move the enemy further, or unlock a finisher against a target in that state.

**Status concepts to explore** (the enum/data shape lives in
[`unit-definition.md`](./unit-definition.md); here we name the *effects*):

- **Prone** — knocked down. Caused by a **trip** (a character or a trap), a **knockback
  slam**, or a spell. Effects to consider:
  - **Takes more damage** while prone (the core, most-agreed payoff — the kill setup).
  - **Easier to displace** — a prone enemy can't brace, so the Berserker shoves it further
    / for more collision (ties statuses to the Kinetic fighter directly).
  - *Open: does prone also cost the enemy its move, or reduce its accuracy/range? Must it
    spend an action to stand? (These are the "other behaviors" — TBD.)*
- **Stunned / incapacitated** — skips or loses part of its turn. The hard-control end;
  pairs with the Mage's freeze. A stunned enemy is a free target and a free shove.
- **Confused** — acts, but unreliably (wrong target, random move, attacks an ally?). Softer
  than stun; interesting for the Rogue as a *setup* rather than a lockout.
- **Vulnerable / marked** — a generic "takes +X% damage from the next hit" the Rogue or
  Mage paints on a target for a fighter to detonate. The cleanest, most composable
  setup→payoff primitive.

**Why it serves the asymmetry:** it gives the low-damage classes a *reason to exist next to*
the fighters instead of competing with them, and it gives the fighters an *external* power
source (other players' setups) on top of their *internal* one (surrounded / collisions).
Cross-link: the Anchor's [start/end-of-turn surrounded buffs](#anchor--the-rooted-fighter)
are themselves statuses; the Berserker's [displacement gets easier](#berserker--the-kinetic-fighter)
against prone/stunned targets.

> **Note — enemy AI.** Several of these concepts (especially the Anchor *wanting* to be
> surrounded) assume enemies behave intelligently — clustering, spacing out to deny the
> ring, avoiding hazards they'd be shoved into, choosing whether to take the bait. Today's
> `brute` AI does none of this. Making the AI *react* to surround/displacement/status is a
> **separate workstream**, parked here so the archetype designs don't quietly depend on it.

---

## Enemies

Not covered here — enemies use the simple **`brute`** model (one move, then one
attack) defined in [`unit-definition.md`](./unit-definition.md). PC asymmetry is
the focus of this doc. (See the AI note under [Statuses](#statuses-setup-for-the-kill) —
reacting to surround/displacement/status is a separate workstream.)

---

## Parking lot / cross-cutting

- **Conditional effects** (flank/backstab bonuses, "after moving N", charge
  distance-scaling) keep coming up — for the Rogue, and now for the Berserker
  (distance → damage/Fury). The old framework deferred these; the asymmetry goal may
  force a small `conditions` block sooner than planned.
- **Status system** gates the *richest* versions of several ideas: GUARD-stance
  protection, **hard taunt** (force the next attack), **next-turn enrage**, the Anchor's
  **surrounded start/end-of-turn buffs**, the **prone/stun/confuse/vulnerable** setup
  conditions ([Statuses](#statuses-setup-for-the-kill)), and Mage hard-control. Note that
  the *immediate* versions — hook, soft taunt, planned-action enrage that bends an attack
  *this tick*, instant collision damage — can ship **before** statuses land; only the
  deferred-to-a-later-turn versions need the status system.
- **Setup → payoff is the cross-archetype glue.** Mage/Rogue inflict statuses; the
  fighters cash them in (prone = more damage *and* easier to shove). This is the main
  argument for the status system carrying weight beyond any single archetype — it's what
  makes a party have *texture*.
- **Anchor vs. Berserker verb split is undecided.** Push/pull/hook/taunt/enrage all "move
  the enemy." Current lean: divide by **reference frame** — Anchor = self-centered +
  compulsion (toward *him*, taunt/enrage); Berserker = board-centered + direct displacement
  (into walls/hazards/units, shove/knockback). Decide whether to hard-split the verbs or
  share primitives and differentiate by frame + targeting shapes.
- **Enemy AI is a hidden dependency.** The Anchor's "want to be surrounded," displacement-
  into-hazards, and status baiting all assume enemies that cluster, space, and avoid
  danger. The `brute` model doesn't — smarter reactive AI is a **separate workstream** the
  archetype designs must not silently assume.
- **Resource carryover** is an open question shared by the fighters (Fury), Mage
  (Mana), and Rogue (Movement refill) — decide a consistent stance on banking vs.
  reset. *Leaning: small carryover cap for Fury/Mana.*
- **Stances & Fury are shared modules**, not Anchor-only — decide whether the Berserker
  draws on them too, and whether the two fighters share one Fury rule or each gets its
  own fuel.
- **Rock-paper-scissors** — note emerging counters (Ranger zoning vs. Rogue/Mage/Berserker
  mobility; Anchor pull/taunt vs. Ranger kite; forced-shove vs. the Anchor's rooted
  stack). Asymmetry is most fun when matchups have texture.
