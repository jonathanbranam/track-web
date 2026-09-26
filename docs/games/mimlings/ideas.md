# Mimlings — Ideas

Brainstorm, not a spec. Everything here is up for grabs.

## The core loop

```
   you gesture ──▶ nearby Mimlings SEE it ──▶ habit weight goes up
        ▲                                            │
        │                                            ▼
   you react to ◀── the herd's culture ◀── habits spread by watching
   what emerged      drifts & splits        each other, pass to children
```

The player is a teacher who can only teach by example. You can't *tell* a
Mimling to share food; you can share food in front of it and hope it catches on.

## The god hand (the whole interface)

Every gesture is both an **action on the world** and a **demonstration** to
whoever is watching.

| Gesture | Touch | Effect | What watchers learn |
|---|---|---|---|
| **Feed** | tap on empty ground | drops a berry | *give food* to a hungry neighbour |
| **Pat** | tap on a Mimling | +happiness, a heart pops | *groom* a neighbour |
| **Carry** | press-and-drag a Mimling | move it anywhere | *lead / walk with* a neighbour |
| **Fling** | drag and flick | tossed; lands dizzy (or worse) | *shove* a neighbour |
| **Plant** | long-press on ground | a berry bush grows over time | *tend plants* |
| **Wiggle** | circle-scribble on a spot | small party: music notes | *dance* (pure culture, no utility) |

Ideas for later: a **boop** (double-tap to wake a sleeping one), a **scold**
(shake the phone? — note `DeviceMotionEvent` needs a secure context, see
root `CLAUDE.md`), shaping land Populous-style (raise a hill, dig a pond).

The hand should have **presence**: a soft shadow on the meadow, Mimlings look up
at it, and a few scatter when it comes down fast. Being *watched* is the theme.

## Habits (memes)

Each Mimling carries a small **repertoire** of habits:

```
habit = { trigger, action, weight }

  trigger:  "neighbour is hungry" | "sees a berry" | "near a bush"
            | "neighbour is sad" | "crowded" | "the hand is near" | ...
  action:   give | groom | lead | shove | tend | dance | hoard | follow | flee
  weight:   0..1 — how likely this fires when the trigger is true
```

How weights change:

- **Watching the hand**: +large (you are the loudest example in their world).
- **Watching a neighbour**: +small. This is how habits spread *without* you.
- **Doing it and it felt good** (need satisfied): +small. Useful habits stick.
- **Decay**: everything drifts slowly toward 0. Unreinforced habits fade —
  including bad ones, if you stop.
- **Children** inherit the parent's repertoire, with small random **mutation**:
  a weight nudged, or occasionally a trigger swapped ("give food *to the hand*"?
  "dance *when crowded*"?). Mutation is where genuinely surprising behaviour
  comes from.

A Mimling can only learn what it *sees* — a short sight radius (and maybe a
facing direction) makes geography matter.

## Needs

Keep it tiny — three or four bars, never shown per-Mimling unless you tap one.

- **Hunger** — eat berries (from you, from bushes, or from a neighbour who *gives*)
- **Energy** — sleep in a pile
- **Social** — be near / groomed by others
- **Fear** — spikes from shoves, flings, the hand slamming down; decays near friends

Needs drive a simple **utility pick**: each tick, score every habit whose
trigger is true against current needs, pick the best (with a little noise).
Default behaviours (wander, eat, sleep) are just habits with fixed weights.

## Growth

- Well-fed, happy Mimlings **split** — Thronglets-style mitosis, with a little
  *pop* animation. One becomes two becomes a crowd.
- A cap (and hunger pressure) keeps it in the low hundreds — see `tech.md`.
- Children appear next to the parent and inherit its habits, so a family is
  also a *lineage of culture*.

## Cultures (the emergent part)

Because habits spread by *local* observation, groups that don't see each other
drift apart:

- The Mimlings on the far side of the pond, who you never visit, keep the
  habits their ancestors had — a **time capsule** of how you used to play.
- A mutation that catches on in one cluster (say, "dance when crowded") becomes
  **that group's thing**.
- When two groups meet, habits compete and blend.

**Make culture visible**: tint Mimlings by their dominant habit (warm pink =
groomers, green = tenders, grey-blue = shovers), or give them little
accessories (flower crown, leaf hat). You should be able to *see* a culture
from zoomed out.

Name clusters automatically ("The Dancers of the East Hill") — cheap and
delightful.

## The mirror (Thronglets' sting)

Thronglets ends with the creatures judging you. Mimlings can do a gentle version
without dialogue trees:

- The game keeps a quiet **ledger** of your gestures.
- At the end of a session (or on demand, via an "Ask the Elders" button), the
  herd's aggregate habits *are* the verdict: "Your Mimlings believe the Hand is
  **generous** and **a little rough**."
- The dark edge: if you fling a lot, shoving spreads and the meadow gets
  anxious. Nobody tells you off — you just watch your kindness or cruelty play
  out in someone else's hands.

Tone target: **cozy with a real mirror**. It should be possible, but never
required or rewarded, to raise a mean herd.

## Possible goals / modes

- **Sandbox** — no goal; watch culture grow. Probably the first build.
- **Session + verdict** — a 5–10 minute day in the meadow, then the Elders speak.
- **Teaching challenges** — "Teach them to cross the river", "Get 20 Mimlings
  tending bushes without touching any of them". Fits the level-picker pattern
  already used by Ball Merge and Orbital Dodger.
- **Two meadows** — compare with a friend's herd (shared login, social graph
  already exists). Far future.

## Small delights

- Mimlings look up and track the hand when it hovers
- Tiny speech-bubble glyphs (♥, ?, !, ♪) instead of text
- Piles of sleeping Mimlings at night
- A Mimling that picks up a *new* habit briefly glows
- An elder (oldest living Mimling) with a tiny beard
